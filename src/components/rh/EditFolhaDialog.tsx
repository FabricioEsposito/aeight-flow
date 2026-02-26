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
import { CurrencyInput } from '@/components/ui/currency-input';
import type { FolhaParcelaRecord } from './FolhaPagamentoTab';

interface EditFolhaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: FolhaParcelaRecord | null;
  defaultMes: number;
  defaultAno: number;
  onSaved: () => void;
}

export function EditFolhaDialog({ open, onOpenChange, record, defaultMes, defaultAno, onSaved }: EditFolhaDialogProps) {
  const [tipoVinculo, setTipoVinculo] = useState('PJ');
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
    if (!open) return;
    
    if (record?.folha_id) {
      // Load full folha data from DB
      loadFolhaData(record.folha_id);
    } else if (record) {
      // New folha for this parcela - default from parcela valor
      resetForm();
      setSalarioBase(record.valor);
    } else {
      resetForm();
    }
  }, [record, open]);

  const loadFolhaData = async (folhaId: string) => {
    const { data } = await supabase
      .from('folha_pagamento')
      .select('*')
      .eq('id', folhaId)
      .single();

    if (data) {
      setTipoVinculo(data.tipo_vinculo);
      setSalarioBase(Number(data.salario_base));
      setInssPercentual(Number(data.inss_percentual));
      setInssValor(Number(data.inss_valor));
      setFgtsPercentual(Number(data.fgts_percentual));
      setFgtsValor(Number(data.fgts_valor));
      setIrrfPercentual(Number(data.irrf_percentual));
      setIrrfValor(Number(data.irrf_valor));
      setVtDesconto(Number(data.vale_transporte_desconto));
      setOutrosDescontos(Number(data.outros_descontos));
      setOutrosProventos(Number(data.outros_proventos));
      setIssPercentual(Number(data.iss_percentual));
      setIssValor(Number(data.iss_valor));
      setPisPercentual(Number(data.pis_percentual));
      setPisValor(Number(data.pis_valor));
      setCofinsPercentual(Number(data.cofins_percentual));
      setCofinsValor(Number(data.cofins_valor));
      setCsllPercentual(Number(data.csll_percentual));
      setCsllValor(Number(data.csll_valor));
      setIrrfPjPercentual(Number(data.irrf_pj_percentual));
      setIrrfPjValor(Number(data.irrf_pj_valor));
      setObservacoes(data.observacoes || '');
      setStatus(data.status);
    }
  };

  const resetForm = () => {
    setTipoVinculo('PJ');
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
  };

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
    return salarioBase + outrosProventos - outrosDescontos;
  };

  const valorLiquido = calcularValorLiquido();

  const handleSave = async () => {
    if (!record) return;

    setSaving(true);
    try {
      const vencDate = new Date(record.data_vencimento + 'T00:00:00');
      const mesRef = vencDate.getMonth() + 1;
      const anoRef = vencDate.getFullYear();

      const payload = {
        fornecedor_id: record.fornecedor_id,
        contrato_id: record.contrato_id,
        parcela_id: record.parcela_id,
        mes_referencia: mesRef,
        ano_referencia: anoRef,
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

      if (record.folha_id) {
        // Update existing folha_pagamento
        const { error } = await supabase.from('folha_pagamento').update(payload).eq('id', record.folha_id);
        if (error) throw error;
      } else {
        // Create new folha_pagamento linked to parcela
        const { error } = await supabase.from('folha_pagamento').insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }

      // Propagate valor to parcela and conta_pagar
      await supabase.from('parcelas_contrato').update({ valor: valorLiquido }).eq('id', record.parcela_id);
      if (record.conta_pagar_id) {
        await supabase.from('contas_pagar').update({ valor: valorLiquido }).eq('id', record.conta_pagar_id);
      }

      toast({ title: 'Sucesso', description: 'Folha de pagamento salva com sucesso.' });
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
          <DialogTitle>
            {record?.folha_id ? 'Editar Folha de Pagamento' : 'Configurar Folha de Pagamento'}
          </DialogTitle>
          {record && (
            <p className="text-sm text-muted-foreground">
              Funcionário: {record.fornecedor_razao_social} — Parcela vencimento: {new Date(record.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Label>Salário Base</Label>
              <CurrencyInput value={salarioBase} onChange={setSalarioBase} />
            </div>
          </div>

          <Separator />

          <h4 className="font-semibold text-sm text-muted-foreground">Ajustes</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Outros Proventos</Label>
              <CurrencyInput value={outrosProventos} onChange={setOutrosProventos} />
            </div>
            <div>
              <Label>Outros Descontos</Label>
              <CurrencyInput value={outrosDescontos} onChange={setOutrosDescontos} />
            </div>
          </div>
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
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
