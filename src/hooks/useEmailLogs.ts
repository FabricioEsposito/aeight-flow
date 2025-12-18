import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailLog {
  id: string;
  cliente_id: string;
  email_destino: string;
  tipo: string;
  status: string;
  erro: string | null;
  created_at: string;
}

interface SendEmailResult {
  success: boolean;
  sent?: number;
  skipped?: number;
  errors?: string[];
  message?: string;
}

export function useEmailLogs() {
  const [loading, setLoading] = useState(false);
  const [lastEmailByClient, setLastEmailByClient] = useState<Map<string, Date>>(new Map());

  const fetchLastEmailsByClient = async (clienteIds: string[]) => {
    if (clienteIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('cliente_id, created_at')
        .in('cliente_id', clienteIds)
        .eq('tipo', 'cobranca')
        .eq('status', 'enviado')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const lastEmails = new Map<string, Date>();
      for (const log of data || []) {
        if (!lastEmails.has(log.cliente_id)) {
          lastEmails.set(log.cliente_id, new Date(log.created_at));
        }
      }

      setLastEmailByClient(lastEmails);
    } catch (error) {
      console.error('Error fetching email logs:', error);
    }
  };

  const getMaxEmailsPerDay = (diasAtraso: number): number => {
    if (diasAtraso <= 1) return 1;
    if (diasAtraso <= 3) return 2;
    if (diasAtraso <= 5) return 3;
    return 999;
  };

  const canSendEmail = async (clienteId: string, diasAtraso: number): Promise<boolean> => {
    const maxEmails = getMaxEmailsPerDay(diasAtraso);
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('email_logs')
      .select('id')
      .eq('cliente_id', clienteId)
      .eq('tipo', 'cobranca')
      .gte('created_at', startOfDay.toISOString());

    if (error) {
      console.error('Error checking email limit:', error);
      return false;
    }

    return (data?.length || 0) < maxEmails;
  };

  const sendCollectionEmail = async (clienteId?: string, force: boolean = false): Promise<SendEmailResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-collection-emails', {
        body: clienteId ? { cliente_id: clienteId, force } : { all: true, force },
      });

      if (error) throw error;

      if (data.success) {
        if (data.sent > 0) {
          toast.success(`${data.sent} e-mail(s) de cobrança enviado(s) com sucesso!`);
        } else if (data.message) {
          toast.info(data.message);
        } else {
          toast.info('Nenhum e-mail foi enviado (limite de frequência atingido)');
        }
      } else {
        toast.error(data.error || 'Erro ao enviar e-mails');
      }

      return data;
    } catch (error: any) {
      console.error('Error sending collection emails:', error);
      toast.error('Erro ao enviar e-mails de cobrança');
      return { success: false, errors: [error.message] };
    } finally {
      setLoading(false);
    }
  };

  const getLastEmailDate = (clienteId: string): Date | undefined => {
    return lastEmailByClient.get(clienteId);
  };

  const formatLastEmail = (clienteId: string): string | null => {
    const lastDate = lastEmailByClient.get(clienteId);
    if (!lastDate) return null;

    const now = new Date();
    const diffMs = now.getTime() - lastDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `há ${diffMins} min`;
    } else if (diffHours < 24) {
      return `há ${diffHours}h`;
    } else {
      return `há ${diffDays}d`;
    }
  };

  return {
    loading,
    sendCollectionEmail,
    fetchLastEmailsByClient,
    canSendEmail,
    getLastEmailDate,
    formatLastEmail,
    getMaxEmailsPerDay,
  };
}
