import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PlanoContasSelect } from '@/components/contratos/PlanoContasSelect';
import { CentroCustoRateio, RateioItem } from '@/components/contratos/CentroCustoRateio';
import { ContaBancariaSelect } from '@/components/financeiro/ContaBancariaSelect';
import { FornecedorSelect } from '@/components/contratos/FornecedorSelect';
import { ClienteSelect } from '@/components/contratos/ClienteSelect';
import { FileUpload } from '@/components/ui/file-upload';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

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
    data_movimentacao?: string | null;
    status?: string;
    fornecedor_id?: string;
    cliente_id?: string;
    parcela_id?: string | null;
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
  data_movimentacao?: string | null;
  fornecedor_id?: string;
  cliente_id?: string;
  fornecedor_changed?: boolean;
  cliente_changed?: boolean;
}

export function EditParcelaDialog({
  open,
  onOpenChange,
  onSave,
  tipo,
  initialData,
}: EditParcelaDialogProps) {
  const [dataVencimento, setDataVencimento] = useState<Date | undefined>();
  const [dataMovimentacao, setDataMovimentacao] = useState<Date | undefined>();
  const [descricao, setDescricao] = useState('');
  const [planoContaId, setPlanoContaId] = useState<string>('');
  const [rateioItems, setRateioItems] = useState<RateioItem[]>([]);
  const [contaBancariaId, setContaBancariaId] = useState<string>('');
  const [juros, setJuros] = useState<number>(0);
  const [multa, setMulta] = useState<number>(0);
  const [desconto, setDesconto] = useState<number>(0);
  const [linkNf, setLinkNf] = useState<string | null>(null);
  const [linkBoleto, setLinkBoleto] = useState<string | null>(null);
  const [fornecedorId, setFornecedorId] = useState<string>('');
  const [clienteId, setClienteId] = useState<string>('');
  const [originalFornecedorId, setOriginalFornecedorId] = useState<string>('');
  const [originalClienteId, setOriginalClienteId] = useState<string>('');

  useEffect(() => {
    if (initialData && open) {
      setDataVencimento(new Date(initialData.data_vencimento + 'T00:00:00'));
      setDataMovimentacao(initialData.data_movimentacao ? new Date(initialData.data_movimentacao + 'T00:00:00') : undefined);
      setDescricao(initialData.descricao);
      setPlanoContaId(initialData.plano_conta_id || 'none');
      setContaBancariaId(initialData.conta_bancaria_id || 'none');
      setJuros(initialData.juros || 0);
      setMulta(initialData.multa || 0);
      setDesconto(initialData.desconto || 0);
      setLinkNf(initialData.link_nf || null);
      setLinkBoleto(initialData.link_boleto || null);
      setFornecedorId(initialData.fornecedor_id || '');
      setClienteId(initialData.cliente_id || '');
      setOriginalFornecedorId(initialData.fornecedor_id || '');
      setOriginalClienteId(initialData.cliente_id || '');

      // Load existing rateio
      const loadRateio = async () => {
        const field = tipo === 'entrada' ? 'conta_receber_id' : 'conta_pagar_id';
        const { data } = await supabase
          .from('lancamentos_centros_custo')
          .select('centro_custo_id, percentual, centros_custo:centro_custo_id(id, codigo, descricao)')
          .eq(field, initialData.id);

        if (data && data.length > 0) {
          setRateioItems(data.map((r: any) => ({
            centro_custo_id: r.centro_custo_id,
            codigo: r.centros_custo?.codigo || '',
            descricao: r.centros_custo?.descricao || '',
            percentual: r.percentual,
          })));
        } else if (initialData.centro_custo) {
          const { data: cc } = await supabase
            .from('centros_custo')
            .select('id, codigo, descricao')
            .eq('id', initialData.centro_custo)
            .single();
          if (cc) {
            setRateioItems([{
              centro_custo_id: cc.id,
              codigo: cc.codigo,
              descricao: cc.descricao,
              percentual: 100,
            }]);
          } else {
            setRateioItems([]);
          }
        } else {
          setRateioItems([]);
        }
      };
      loadRateio();
    }
  }, [initialData, open, tipo]);

  const [valorOriginal, setValorOriginal] = useState<number>(0);

  useEffect(() => {
    if (initialData && open) {
      setValorOriginal(initialData.valor_original ?? 0);
    }
  }, [initialData, open]);

  const valorTotal = valorOriginal + juros + multa - desconto;

  const fornecedorChanged = tipo === 'saida' && fornecedorId !== originalFornecedorId && originalFornecedorId !== '';
  const clienteChanged = tipo === 'entrada' && clienteId !== originalClienteId && originalClienteId !== '';
  const hasParcelaId = !!initialData?.parcela_id;

  const handleSave = async () => {
    console.log('[EditParcelaDialog] handleSave called', { initialData: !!initialData, dataVencimento: !!dataVencimento, fornecedorId, clienteId, fornecedorChanged, clienteChanged });
    if (!initialData || !dataVencimento) return;

    const centroCustoLegacy = rateioItems.length > 0 ? rateioItems[0].centro_custo_id : undefined;

    const data: EditParcelaData = {
      id: initialData.id,
      data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
      descricao,
      plano_conta_id: planoContaId && planoContaId !== 'none' ? planoContaId : undefined,
      centro_custo: centroCustoLegacy,
      conta_bancaria_id: contaBancariaId && contaBancariaId !== 'none' ? contaBancariaId : undefined,
      juros: juros,
      multa: multa,
      desconto: desconto,
      valor_total: valorTotal,
      valor_original: valorOriginal,
      link_nf: linkNf,
      link_boleto: linkBoleto,
      data_movimentacao: dataMovimentacao ? format(dataMovimentacao, 'yyyy-MM-dd') : null,
      fornecedor_id: tipo === 'saida' ? fornecedorId : undefined,
      cliente_id: tipo === 'entrada' ? clienteId : undefined,
      fornecedor_changed: fornecedorChanged,
      cliente_changed: clienteChanged,
    };

    // Save rateio
    const field = tipo === 'entrada' ? 'conta_receber_id' : 'conta_pagar_id';
    await supabase.from('lancamentos_centros_custo').delete().eq(field, initialData.id);
    if (rateioItems.length > 0) {
      await supabase.from('lancamentos_centros_custo').insert(
        rateioItems.map(item => ({
          [field]: initialData.id,
          centro_custo_id: item.centro_custo_id,
          percentual: item.percentual,
        }))
      );
    }

    console.log('[EditParcelaDialog] onSave data:', JSON.stringify(data, null, 2));
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
          {/* Fornecedor / Cliente */}
          {tipo === 'saida' && (
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <FornecedorSelect
                value={fornecedorId}
                onChange={setFornecedorId}
              />
            </div>
          )}

          {tipo === 'entrada' && (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <ClienteSelect
                value={clienteId}
                onChange={setClienteId}
              />
            </div>
          )}

          {/* Alerta sobre alteração de fornecedor/cliente em lançamento recorrente */}
          {(fornecedorChanged || clienteChanged) && hasParcelaId && (
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                Ao alterar o {tipo === 'saida' ? 'fornecedor' : 'cliente'}, todas as parcelas pendentes deste contrato também serão atualizadas automaticamente.
              </AlertDescription>
            </Alert>
          )}

          {(fornecedorChanged || clienteChanged) && !hasParcelaId && (
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                O {tipo === 'saida' ? 'fornecedor' : 'cliente'} deste lançamento será alterado.
              </AlertDescription>
            </Alert>
          )}

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
              <Label>Data de Movimentação {tipo === 'entrada' ? '(Recebimento)' : '(Pagamento)'}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataMovimentacao && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataMovimentacao ? format(dataMovimentacao, "dd/MM/yyyy", { locale: ptBR }) : "Sem data de movimentação"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataMovimentacao}
                    onSelect={setDataMovimentacao}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {dataMovimentacao && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setDataMovimentacao(undefined)}
                >
                  Limpar data de movimentação
                </Button>
              )}
            </div>
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

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição da parcela"
            />
          </div>

          <div className="space-y-2">
              <Label>Plano de Contas</Label>
              <PlanoContasSelect 
                value={planoContaId === 'none' ? '' : planoContaId} 
                onChange={setPlanoContaId}
                tipo={tipo}
              />
          </div>

          <CentroCustoRateio
            value={rateioItems}
            onChange={setRateioItems}
            valorTotal={valorOriginal}
          />

          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium">Ajustes de Valor</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Juros (R$)</Label>
                <CurrencyInput
                  value={juros}
                  onChange={setJuros}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label>Multa (R$)</Label>
                <CurrencyInput
                  value={multa}
                  onChange={setMulta}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label>Desconto (R$)</Label>
                <CurrencyInput
                  value={desconto}
                  onChange={setDesconto}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Valor Original (R$)</Label>
              <CurrencyInput
                value={valorOriginal}
                onChange={setValorOriginal}
                placeholder="0,00"
              />
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Valor Original:</span>
                <span className="font-medium">{formatCurrency(valorOriginal)}</span>
              </div>
              {juros > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>+ Juros:</span>
                  <span>{formatCurrency(juros)}</span>
                </div>
              )}
              {multa > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>+ Multa:</span>
                  <span>{formatCurrency(multa)}</span>
                </div>
              )}
              {desconto > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>- Desconto:</span>
                  <span>{formatCurrency(desconto)}</span>
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
