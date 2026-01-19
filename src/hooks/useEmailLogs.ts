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
  quota_reached?: boolean;
  today_count?: number;
  daily_limit?: number;
}

interface EmailQuota {
  today_count: number;
  daily_limit: number;
  remaining: number;
  quota_available: boolean;
}

// Limite global diário (mantendo sincronizado com edge function)
const DAILY_EMAIL_LIMIT = 95;

export function useEmailLogs() {
  const [loading, setLoading] = useState(false);
  const [lastEmailByClient, setLastEmailByClient] = useState<Map<string, Date>>(new Map());
  const [emailQuota, setEmailQuota] = useState<EmailQuota | null>(null);

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

  // OTIMIZAÇÃO: Agora sempre retorna 1 (1 e-mail por dia por cliente)
  const getMaxEmailsPerDay = (_diasAtraso: number): number => {
    return 1; // Sempre 1 e-mail por dia
  };

  // Buscar total de e-mails enviados hoje
  const getTodayEmailCount = async (): Promise<number> => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('email_logs')
      .select('id')
      .gte('created_at', startOfDay.toISOString())
      .eq('status', 'enviado');

    if (error) {
      console.error('Error counting today emails:', error);
      return 0;
    }

    return data?.length || 0;
  };

  // Calcular quota restante
  const getRemainingQuota = async (): Promise<EmailQuota> => {
    const todayCount = await getTodayEmailCount();
    const remaining = DAILY_EMAIL_LIMIT - todayCount;
    
    const quota: EmailQuota = {
      today_count: todayCount,
      daily_limit: DAILY_EMAIL_LIMIT,
      remaining: Math.max(0, remaining),
      quota_available: remaining > 0,
    };

    setEmailQuota(quota);
    return quota;
  };

  // Buscar quota da edge function (mais precisa)
  const fetchEmailQuota = async (): Promise<EmailQuota | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-collection-emails', {
        body: { check_quota: true },
      });

      if (error) throw error;

      if (data.success) {
        const quota: EmailQuota = {
          today_count: data.today_count,
          daily_limit: data.daily_limit,
          remaining: data.remaining,
          quota_available: data.quota_available,
        };
        setEmailQuota(quota);
        return quota;
      }

      return null;
    } catch (error) {
      console.error('Error fetching email quota:', error);
      // Fallback para contagem local
      return getRemainingQuota();
    }
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
        // Atualizar quota após envio
        if (data.today_count !== undefined && data.daily_limit !== undefined) {
          setEmailQuota({
            today_count: data.today_count,
            daily_limit: data.daily_limit,
            remaining: data.daily_limit - data.today_count,
            quota_available: data.today_count < data.daily_limit,
          });
        }

        if (data.quota_reached) {
          toast.warning(`Limite diário de e-mails atingido (${data.today_count}/${data.daily_limit})`);
        } else if (data.sent > 0) {
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
    emailQuota,
    sendCollectionEmail,
    fetchLastEmailsByClient,
    canSendEmail,
    getLastEmailDate,
    formatLastEmail,
    getMaxEmailsPerDay,
    getTodayEmailCount,
    getRemainingQuota,
    fetchEmailQuota,
  };
}
