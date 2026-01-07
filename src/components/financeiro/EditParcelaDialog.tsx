import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PlanoContasSelect } from '@/components/contratos/PlanoContasSelect';
import CentroCustoSelect from '@/components/centro-custos/CentroCustoSelect';
import { ContaBancariaSelect } from '@/components/financeiro/ContaBancariaSelect';
import { FileUpload } from '@/components/ui/file-upload';

interface EditParcelaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: EditParcelaData) => void;
  tipo: 'entrada' | 'saida';
  initialData?: {
    id: string;
    data_vencimento: string;
    descricao: string;
    plano_conta_id?: string;
    centro_custo?: string;
    conta_bancaria_id?: string;
    valor_original: number;
    juros?: number;
    multa?: number;
    desconto?: number;
    link_nf?: string | null;
    link_boleto?: string | null;
  };
}

export interface EditParcelaData {
  id: string;
  data_vencimento: string;
  descricao: string;
  plano_conta_id?: string;
  centro_custo?: string;
  conta_bancaria_id?: string;
  juros: number;
  multa: number;
  desconto: number;
  valor_total: number;
  valor_original: number;
  link_nf?: string | null;
  link_boleto?: string | null;
}

export function EditParcelaDialog({
  open,
  onOpenChange,
  onSave,
  tipo,
  initialData,
}: EditParcelaDialogProps) {
  const [dataVencimento, setDataVencimento] = useState<Date | undefined>();
  const [descricao, setDescricao] = useState('');
  const [planoContaId, setPlanoContaId] = useState<string>('');
  const [centroCusto, setCentroCusto] = useState('');
  const [contaBancariaId, setContaBancariaId] = useState<string>('');
  const [juros, setJuros] = useState('0');
  const [multa, setMulta] = useState('0');
  const [desconto, setDesconto] = useState('0');
  const [linkNf, setLinkNf] = useState<string | null>(null);
  const [linkBoleto, setLinkBoleto] = useState<string | null>(null);

  useEffect(() => {
    if (initialData && open) {
      // Usar T00:00:00 para evitar problemas de timezone que alteram a data
      setDataVencimento(new Date(initialData.data_vencimento + 'T00:00:00'));
      setDescricao(initialData.descricao);
      setPlanoContaId(initialData.plano_conta_id || 'none');
      setCentroCusto(initialData.centro_custo || '');
      setContaBancariaId(initialData.conta_bancaria_id || 'none');
      setJuros(initialData.juros?.toString() || '0');
      setMulta(initialData.multa?.toString() || '0');
      setDesconto(initialData.desconto?.toString() || '0');
      setLinkNf(initialData.link_nf || null);
      setLinkBoleto(initialData.link_boleto || null);
    }
  }, [initialData, open]);

  const parseNumber = (value: string): number => {
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const valorOriginal = initialData?.valor_original || 0;
  const valorJuros = parseNumber(juros);
  const valorMulta = parseNumber(multa);
  const valorDesconto = parseNumber(desconto);
  const valorTotal = valorOriginal + valorJuros + valorMulta - valorDesconto;

  const handleSave = () => {
    if (!initialData || !dataVencimento) return;

    const data: EditParcelaData = {
      id: initialData.id,
      data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
      descricao,
      plano_conta_id: planoContaId && planoContaId !== 'none' ? planoContaId : undefined,
      centro_custo: centroCusto || undefined,
      conta_bancaria_id: contaBancariaId && contaBancariaId !== 'none' ? contaBancariaId : undefined,
      juros: valorJuros,
      multa: valorMulta,
      desconto: valorDesconto,
      valor_total: valorTotal,
      valor_original: valorOriginal,
      link_nf: linkNf,
      link_boleto: linkBoleto,
    };

    onSave(data);
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Parcela</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
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
                    {dataVencimento ? format(dataVencimento, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataVencimento}
                    onSelect={setDataVencimento}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Conta Bancária</Label>
              <ContaBancariaSelect
                value={contaBancariaId}
                onValueChange={setContaBancariaId}
                placeholder="Selecione"
                showNoneOption
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição da parcela"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plano de Contas</Label>
              <PlanoContasSelect 
                value={planoContaId === 'none' ? '' : planoContaId} 
                onChange={setPlanoContaId}
                tipo={tipo}
              />
            </div>

            <div className="space-y-2">
              <Label>Centro de Custo</Label>
              <CentroCustoSelect 
                value={centroCusto}
                onValueChange={setCentroCusto}
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium">Ajustes de Valor</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Juros (R$)</Label>
                <Input
                  value={juros}
                  onChange={(e) => setJuros(e.target.value)}
                  placeholder="0,00"
                  type="text"
                />
              </div>

              <div className="space-y-2">
                <Label>Multa (R$)</Label>
                <Input
                  value={multa}
                  onChange={(e) => setMulta(e.target.value)}
                  placeholder="0,00"
                  type="text"
                />
              </div>

              <div className="space-y-2">
                <Label>Desconto (R$)</Label>
                <Input
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                  placeholder="0,00"
                  type="text"
                />
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Valor Original:</span>
                <span className="font-medium">{formatCurrency(valorOriginal)}</span>
              </div>
              {valorJuros > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>+ Juros:</span>
                  <span>{formatCurrency(valorJuros)}</span>
                </div>
              )}
              {valorMulta > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>+ Multa:</span>
                  <span>{formatCurrency(valorMulta)}</span>
                </div>
              )}
              {valorDesconto > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>- Desconto:</span>
                  <span>{formatCurrency(valorDesconto)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Valor Total:</span>
                <span>{formatCurrency(valorTotal)}</span>
              </div>
            </div>
          </div>

          {/* Anexos - Apenas para contas a pagar (saida) */}
          {tipo === 'saida' && initialData?.id && (
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Anexos</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <FileUpload
                  bucket="faturamento-docs"
                  path={`contas-pagar/${initialData.id}/nf.pdf`}
                  value={linkNf}
                  onChange={setLinkNf}
                  accept=".pdf"
                  maxSizeMB={10}
                  label="Nota Fiscal (PDF)"
                />
                
                <FileUpload
                  bucket="faturamento-docs"
                  path={`contas-pagar/${initialData.id}/boleto.pdf`}
                  value={linkBoleto}
                  onChange={setLinkBoleto}
                  accept=".pdf"
                  maxSizeMB={10}
                  label="Boleto (PDF)"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!dataVencimento || !descricao}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}