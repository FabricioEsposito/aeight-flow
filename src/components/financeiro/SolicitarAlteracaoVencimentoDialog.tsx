import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SolicitarAlteracaoVencimentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  lancamentoId: string;
  tipoLancamento: 'receber' | 'pagar';
  dataVencimentoAtual: string;
}

export function SolicitarAlteracaoVencimentoDialog({
  open,
  onOpenChange,
  onSuccess,
  lancamentoId,
  tipoLancamento,
  dataVencimentoAtual,
}: SolicitarAlteracaoVencimentoDialogProps) {
  const { toast } = useToast();
  const [novaData, setNovaData] = useState<Date | undefined>();
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!novaData) {
      toast({
        title: "Data obrigatória",
        description: "Selecione a nova data de vencimento",
        variant: "destructive",
      });
      return;
    }

    if (!motivo.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Informe o motivo da solicitação",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('solicitacoes_ajuste_financeiro')
        .insert({
          tipo_lancamento: tipoLancamento,
          lancamento_id: lancamentoId,
          data_vencimento_atual: dataVencimentoAtual,
          data_vencimento_solicitada: format(novaData, 'yyyy-MM-dd'),
          solicitante_id: user.id,
          motivo_solicitacao: motivo,
          status: 'pendente'
        });

      if (error) throw error;

      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação foi enviada para aprovação do administrador",
      });

      onSuccess();
      onOpenChange(false);
      setNovaData(undefined);
      setMotivo('');
    } catch (error) {
      console.error('Erro ao solicitar alteração:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Alteração de Vencimento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data de Vencimento Atual</Label>
            <div className="text-sm text-muted-foreground">
              {format(new Date(dataVencimentoAtual + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nova Data de Vencimento*</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !novaData && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {novaData ? format(novaData, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={novaData}
                  onSelect={setNovaData}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da Solicitação*</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explique o motivo da alteração..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Enviando..." : "Enviar Solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
