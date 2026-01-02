import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PlanoContasSelect } from '@/components/contratos/PlanoContasSelect';
import CentroCustoSelect from '@/components/centro-custos/CentroCustoSelect';
import { ContaBancariaSelect } from '@/components/financeiro/ContaBancariaSelect';

interface ContaBancaria {
  id: string;
  descricao: string;
  banco: string;
}

interface SolicitarAjusteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  lancamentoId: string;
  tipoLancamento: 'receber' | 'pagar';
  tipo: 'entrada' | 'saida';
  initialData: {
    data_vencimento: string;
    descricao: string;
    valor: number;
    juros: number;
    multa: number;
    desconto: number;
    conta_bancaria_id: string;
    plano_conta_id?: string;
    centro_custo?: string;
  };
  contasBancarias: ContaBancaria[];
}

export function SolicitarAjusteDialog({
  open,
  onOpenChange,
  onSuccess,
  lancamentoId,
  tipoLancamento,
  tipo,
  initialData,
  contasBancarias,
}: SolicitarAjusteDialogProps) {
  const { toast } = useToast();
  const [dataVencimento, setDataVencimento] = useState<Date | undefined>();
  const [contaBancariaId, setContaBancariaId] = useState('');
  const [planoContaId, setPlanoContaId] = useState('');
  const [centroCusto, setCentroCusto] = useState('');
  const [juros, setJuros] = useState('');
  const [multa, setMulta] = useState('');
  const [desconto, setDesconto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && initialData) {
      setDataVencimento(new Date(initialData.data_vencimento));
      setContaBancariaId(initialData.conta_bancaria_id || '');
      setPlanoContaId(initialData.plano_conta_id || '');
      setCentroCusto(initialData.centro_custo || '');
      setJuros(initialData.juros?.toString() || '0');
      setMulta(initialData.multa?.toString() || '0');
      setDesconto(initialData.desconto?.toString() || '0');
      setMotivo('');
    }
  }, [open, initialData]);

  const parseNumber = (value: string): number => {
    if (!value) return 0;
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleSubmit = async () => {
    if (!dataVencimento) {
      toast({
        title: "Data obrigatória",
        description: "Selecione a data de vencimento",
        variant: "destructive",
      });
      return;
    }

    if (!motivo.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Informe o motivo da solicitação de ajuste",
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
          data_vencimento_atual: initialData.data_vencimento,
          data_vencimento_solicitada: format(dataVencimento, 'yyyy-MM-dd'),
          solicitante_id: user.id,
          motivo_solicitacao: motivo,
          status: 'pendente',
          valor_original: initialData.valor,
          juros_atual: initialData.juros || 0,
          juros_solicitado: parseNumber(juros),
          multa_atual: initialData.multa || 0,
          multa_solicitada: parseNumber(multa),
          desconto_atual: initialData.desconto || 0,
          desconto_solicitado: parseNumber(desconto),
          plano_conta_id: planoContaId || null,
          centro_custo: centroCusto || null,
          conta_bancaria_id: contaBancariaId || null,
        });

      if (error) throw error;

      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação de ajuste foi enviada para aprovação do administrador",
      });

      onSuccess();
      onOpenChange(false);
      setMotivo('');
    } catch (error) {
      console.error('Erro ao solicitar ajuste:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const valorOriginal = initialData?.valor || 0;
  const valorJuros = parseNumber(juros);
  const valorMulta = parseNumber(multa);
  const valorDesconto = parseNumber(desconto);
  const valorTotal = valorOriginal + valorJuros + valorMulta - valorDesconto;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Ajuste de Lançamento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Vencimento*</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataVencimento && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataVencimento ? format(dataVencimento, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataVencimento}
                    onSelect={setDataVencimento}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Conta Bancária</Label>
              <ContaBancariaSelect
                value={contaBancariaId}
                onValueChange={setContaBancariaId}
                placeholder="Selecione a conta"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plano de Contas</Label>
              <PlanoContasSelect 
                value={planoContaId} 
                onChange={setPlanoContaId} 
                tipo={tipo}
              />
            </div>

            <div className="space-y-2">
              <Label>Centro de Custo</Label>
              <CentroCustoSelect value={centroCusto} onValueChange={setCentroCusto} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">Ajustes de Valor</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="juros">Juros (R$)</Label>
                <Input
                  id="juros"
                  value={juros}
                  onChange={(e) => setJuros(e.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="multa">Multa (R$)</Label>
                <Input
                  id="multa"
                  value={multa}
                  onChange={(e) => setMulta(e.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desconto">Desconto (R$)</Label>
                <Input
                  id="desconto"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Original:</span>
              <span className="font-medium">R$ {formatCurrency(valorOriginal)}</span>
            </div>
            {valorJuros > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Juros:</span>
                <span className="text-emerald-600">+ R$ {formatCurrency(valorJuros)}</span>
              </div>
            )}
            {valorMulta > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Multa:</span>
                <span className="text-emerald-600">+ R$ {formatCurrency(valorMulta)}</span>
              </div>
            )}
            {valorDesconto > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Desconto:</span>
                <span className="text-destructive">- R$ {formatCurrency(valorDesconto)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold pt-2 border-t">
              <span>Valor Total:</span>
              <span>R$ {formatCurrency(valorTotal)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da Solicitação*</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explique o motivo do ajuste solicitado..."
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
