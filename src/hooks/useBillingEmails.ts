import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseBillingEmailsReturn {
  sendBillingEmails: (parcelaIds: string[]) => Promise<{ success: boolean; sent: number; errors?: string[] }>;
  isLoading: boolean;
}

export function useBillingEmails(): UseBillingEmailsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendBillingEmails = async (parcelaIds: string[]) => {
    if (parcelaIds.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhuma parcela selecionada",
        variant: "destructive",
      });
      return { success: false, sent: 0 };
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-billing-emails', {
        body: { parcela_ids: parcelaIds },
      });

      if (error) throw error;

      if (data.success) {
        const message = data.sent > 0 
          ? `${data.sent} e-mail(s) enviado(s) com sucesso!`
          : "Nenhum e-mail foi enviado";
        
        toast({
          title: data.sent > 0 ? "Sucesso" : "Aviso",
          description: message,
          variant: data.sent > 0 ? "default" : "destructive",
        });

        return {
          success: true,
          sent: data.sent,
          errors: data.errors,
        };
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Error sending billing emails:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar os e-mails",
        variant: "destructive",
      });
      return { success: false, sent: 0, errors: [error.message] };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendBillingEmails,
    isLoading,
  };
}
