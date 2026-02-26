import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { FornecedorSelect } from '@/components/contratos/FornecedorSelect';
import { CurrencyInput } from '@/components/ui/currency-input';

interface EditFolhaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any | null;
  defaultMes: number;
  defaultAno: number;
  onSaved: () => void;
}

export function EditFolhaDialog({ open, onOpenChange, record, defaultMes, defaultAno, onSaved }: EditFolhaDialogProps) {
  const [fornecedorId, setFornecedorId] = useState('');
  const [tipoVinculo, setTipoVinculo] = useState('PJ');
  const [mesReferencia, setMesReferencia] = useState(defaultMes);
  const [anoReferencia, setAnoReferencia] = useState(defaultAno);
  const [salarioBase, setSalarioBase] = useState(0);
  const [inssPercentual, setInssPercentual] = useState(0);
  const [inssValor, setInssValor] = useState(0);
  const [fgtsPercentual, setFgtsPercentual] = useState(0);
  const [fgtsValor, setFgtsValor] = useState(0);
  const [irrfPercentual, setIrrfPercentual] = useState(0);
  const [irrfValor, setIrrfValor] = useState(0);
  const [vtDesconto, setVtDesconto] = useState(0);
  const [outrosDescontos, setOutrosDescontos] = useState(0);
  const [outrosProventos, setOutrosProventos] = useState(0);
  const [issPercentual, setIssPercentual] = useState(0);
  const [issValor, setIssValor] = useState(0);
  const [pisPercentual, setPisPercentual] = useState(0);
  const [pisValor, setPisValor] = useState(0);
  const [cofinsPercentual, setCofinsPercentual] = useState(0);
  const [cofinsValor, setCofinsValor] = useState(0);
  const [csllPercentual, setCsllPercentual] = useState(0);
  const [csllValor, setCsllValor] = useState(0);
  const [irrfPjPercentual, setIrrfPjPercentual] = useState(0);
  const [irrfPjValor, setIrrfPjValor] = useState(0);
  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState('pendente');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (record) {
      setFornecedorId(record.fornecedor_id);
      setTipoVinculo(record.tipo_vinculo);
      setMesReferencia(record.mes_referencia);
      setAnoReferencia(record.ano_referencia);
      setSalarioBase(record.salario_base);
      setInssPercentual(record.inss_percentual);
      setInssValor(record.inss_valor);
      setFgtsPercentual(record.fgts_percentual);
      setFgtsValor(record.fgts_valor);
      setIrrfPercentual(record.irrf_percentual);
      setIrrfValor(record.irrf_valor);
      setVtDesconto(record.vale_transporte_desconto);
      setOutrosDescontos(record.outros_descontos);
      setOutrosProventos(record.outros_proventos);
      setIssPercentual(record.iss_percentual);
      setIssValor(record.iss_valor);
      setPisPercentual(record.pis_percentual);
      setPisValor(record.pis_valor);
      setCofinsPercentual(record.cofins_percentual);
      setCofinsValor(record.cofins_valor);
      setCsllPercentual(record.csll_percentual);
      setCsllValor(record.csll_valor);
      setIrrfPjPercentual(record.irrf_pj_percentual);
      setIrrfPjValor(record.irrf_pj_valor);
      setObservacoes(record.observacoes || '');
      setStatus(record.status);
    } else {
      setFornecedorId('');
      setTipoVinculo('PJ');
      setMesReferencia(defaultMes);
      setAnoReferencia(defaultAno);
      setSalarioBase(0);
      setInssPercentual(0); setInssValor(0);
      setFgtsPercentual(0); setFgtsValor(0);
      setIrrfPercentual(0); setIrrfValor(0);
      setVtDesconto(0); setOutrosDescontos(0); setOutrosProventos(0);
      setIssPercentual(0); setIssValor(0);
      setPisPercentual(0); setPisValor(0);
      setCofinsPercentual(0); setCofinsValor(0);
      setCsllPercentual(0); setCsllValor(0);
      setIrrfPjPercentual(0); setIrrfPjValor(0);
      setObservacoes('');
      setStatus('pendente');
    }
  }, [record, defaultMes, defaultAno, open]);

  useEffect(() => {
    if (tipoVinculo === 'CLT') {
      setInssValor(Math.round(salarioBase * inssPercentual) / 100);
      setFgtsValor(Math.round(salarioBase * fgtsPercentual) / 100);
      setIrrfValor(Math.round(salarioBase * irrfPercentual) / 100);
    } else {
      setIssValor(Math.round(salarioBase * issPercentual) / 100);
      setPisValor(Math.round(salarioBase * pisPercentual) / 100);
      setCofinsValor(Math.round(salarioBase * cofinsPercentual) / 100);
      setCsllValor(Math.round(salarioBase * csllPercentual) / 100);
      setIrrfPjValor(Math.round(salarioBase * irrfPjPercentual) / 100);
    }
  }, [salarioBase, tipoVinculo, inssPercentual, fgtsPercentual, irrfPercentual, issPercentual, pisPercentual, cofinsPercentual, csllPercentual, irrfPjPercentual]);

  const calcularValorLiquido = () => {
    if (tipoVinculo === 'CLT') {
      return salarioBase + outrosProventos - inssValor - irrfValor - vtDesconto - outrosDescontos;
    }
    return salarioBase - issValor - pisValor - cofinsValor - csllValor - irrfPjValor;
  };

  const valorLiquido = calcularValorLiquido();

  const handleSave = async () => {
    if (!fornecedorId) {
      toast({ title: 'Erro', description: 'Selecione um fornecedor.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fornecedor_id: fornecedorId,
        mes_referencia: mesReferencia,
        ano_referencia: anoReferencia,
        tipo_vinculo: tipoVinculo,
        salario_base: salarioBase,
        inss_percentual: inssPercentual, inss_valor: inssValor,
        fgts_percentual: fgtsPercentual, fgts_valor: fgtsValor,
        irrf_percentual: irrfPercentual, irrf_valor: irrfValor,
        vale_transporte_desconto: vtDesconto,
        outros_descontos: outrosDescontos,
        outros_proventos: outrosProventos,
        iss_percentual: issPercentual, iss_valor: issValor,
        pis_percentual: pisPercentual, pis_valor: pisValor,
        cofins_percentual: cofinsPercentual, cofins_valor: cofinsValor,
        csll_percentual: csllPercentual, csll_valor: csllValor,
        irrf_pj_percentual: irrfPjPercentual, irrf_pj_valor: irrfPjValor,
        valor_liquido: valorLiquido,
        observacoes: observacoes || null,
        status,
      };

      if (record) {
        const { error } = await supabase.from('folha_pagamento').update(payload).eq('id', record.id);
        if (error) throw error;
        if (record.conta_pagar_id) {
          await supabase.from('contas_pagar').update({ valor: valorLiquido }).eq('id', record.conta_pagar_id);
        }
        if (record.parcela_id) {
          await supabase.from('parcelas_contrato').update({ valor: valorLiquido }).eq('id', record.parcela_id);
        }
      } else {
        const { error } = await supabase.from('folha_pagamento').insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }

      toast({ title: 'Sucesso', description: record ? 'Registro atualizado.' : 'Registro criado.' });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar folha:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? 'Editar Folha de Pagamento' : 'Novo Lançamento de Folha'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Funcionário (Fornecedor) *</Label>
            <FornecedorSelect value={fornecedorId} onChange={setFornecedorId} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Tipo de Vínculo</Label>
              <Select value={tipoVinculo} onValueChange={setTipoVinculo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLT">CLT</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mês</Label>
              <Select value={String(mesReferencia)} onValueChange={(v) => setMesReferencia(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <SelectItem key={m} value={String(m)}>{String(m).padStart(2, '0')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano</Label>
              <Input type="number" value={anoReferencia} onChange={(e) => setAnoReferencia(parseInt(e.target.value) || defaultAno)} />
            </div>
          </div>

          <div>
            <Label>Salário Base</Label>
            <CurrencyInput value={salarioBase} onChange={setSalarioBase} />
          </div>

          <Separator />

          {tipoVinculo === 'CLT' ? (
            <>
              <h4 className="font-semibold text-sm text-muted-foreground">Encargos e Descontos CLT</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>INSS (%)</Label>
                  <Input type="number" step="0.01" value={inssPercentual} onChange={(e) => setInssPercentual(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>INSS (R$)</Label>
                  <CurrencyInput value={inssValor} onChange={setInssValor} />
                </div>
                <div>
                  <Label>FGTS (%)</Label>
                  <Input type="number" step="0.01" value={fgtsPercentual} onChange={(e) => setFgtsPercentual(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>FGTS (R$)</Label>
                  <CurrencyInput value={fgtsValor} onChange={setFgtsValor} />
                </div>
                <div>
                  <Label>IRRF (%)</Label>
                  <Input type="number" step="0.01" value={irrfPercentual} onChange={(e) => setIrrfPercentual(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>IRRF (R$)</Label>
                  <CurrencyInput value={irrfValor} onChange={setIrrfValor} />
                </div>
                <div>
                  <Label>Vale Transporte (Desconto)</Label>
                  <CurrencyInput value={vtDesconto} onChange={setVtDesconto} />
                </div>
                <div>
                  <Label>Outros Descontos</Label>
                  <CurrencyInput value={outrosDescontos} onChange={setOutrosDescontos} />
                </div>
                <div>
                  <Label>Outros Proventos</Label>
                  <CurrencyInput value={outrosProventos} onChange={setOutrosProventos} />
                </div>
              </div>
            </>
          ) : (
            <>
              <h4 className="font-semibold text-sm text-muted-foreground">Impostos PJ</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ISS (%)</Label>
                  <Input type="number" step="0.01" value={issPercentual} onChange={(e) => setIssPercentual(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>ISS (R$)</Label>
                  <CurrencyInput value={issValor} onChange={setIssValor} />
                </div>
                <div>
                  <Label>PIS (%)</Label>
                  <Input type="number" step="0.01" value={pisPercentual} onChange={(e) => setPisPercentual(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>PIS (R$)</Label>
                  <CurrencyInput value={pisValor} onChange={setPisValor} />
                </div>
                <div>
                  <Label>COFINS (%)</Label>
                  <Input type="number" step="0.01" value={cofinsPercentual} onChange={(e) => setCofinsPercentual(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>COFINS (R$)</Label>
                  <CurrencyInput value={cofinsValor} onChange={setCofinsValor} />
                </div>
                <div>
                  <Label>CSLL (%)</Label>
                  <Input type="number" step="0.01" value={csllPercentual} onChange={(e) => setCsllPercentual(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>CSLL (R$)</Label>
                  <CurrencyInput value={csllValor} onChange={setCsllValor} />
                </div>
                <div>
                  <Label>IRRF (%)</Label>
                  <Input type="number" step="0.01" value={irrfPjPercentual} onChange={(e) => setIrrfPjPercentual(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>IRRF (R$)</Label>
                  <CurrencyInput value={irrfPjValor} onChange={setIrrfPjValor} />
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
            <span className="font-semibold">Valor Líquido:</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(valorLiquido)}</span>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="processado">Processado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações opcionais..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : record ? 'Salvar Alterações' : 'Criar Lançamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
