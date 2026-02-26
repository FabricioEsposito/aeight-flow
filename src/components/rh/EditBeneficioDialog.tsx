import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { FornecedorSelect } from '@/components/contratos/FornecedorSelect';
import { CurrencyInput } from '@/components/ui/currency-input';

const tiposBeneficio = ['VR', 'VA', 'VT', 'Plano de Saude', 'Plano Odontologico', 'Seguro de Vida', 'Outros'];

interface EditBeneficioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any | null;
  defaultMes: number;
  defaultAno: number;
  onSaved: () => void;
}

export function EditBeneficioDialog({ open, onOpenChange, record, defaultMes, defaultAno, onSaved }: EditBeneficioDialogProps) {
  const [fornecedorId, setFornecedorId] = useState('');
  const [tipoBeneficio, setTipoBeneficio] = useState('Outros');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState(0);
  const [mesReferencia, setMesReferencia] = useState(defaultMes);
  const [anoReferencia, setAnoReferencia] = useState(defaultAno);
  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState('pendente');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (record) {
      setFornecedorId(record.fornecedor_id);
      setTipoBeneficio(record.tipo_beneficio);
      setDescricao(record.descricao || '');
      setValor(record.valor);
      setMesReferencia(record.mes_referencia);
      setAnoReferencia(record.ano_referencia);
      setObservacoes(record.observacoes || '');
      setStatus(record.status);
    } else {
      setFornecedorId('');
      setTipoBeneficio('Outros');
      setDescricao('');
      setValor(0);
      setMesReferencia(defaultMes);
      setAnoReferencia(defaultAno);
      setObservacoes('');
      setStatus('pendente');
    }
  }, [record, defaultMes, defaultAno, open]);

  const handleSave = async () => {
    if (!fornecedorId) {
      toast({ title: 'Erro', description: 'Selecione um fornecedor.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fornecedor_id: fornecedorId,
        tipo_beneficio: tipoBeneficio,
        descricao: descricao || null,
        valor,
        mes_referencia: mesReferencia,
        ano_referencia: anoReferencia,
        observacoes: observacoes || null,
        status,
      };

      if (record) {
        const { error } = await supabase.from('controle_beneficios').update(payload).eq('id', record.id);
        if (error) throw error;
        if (record.conta_pagar_id) {
          await supabase.from('contas_pagar').update({ valor }).eq('id', record.conta_pagar_id);
        }
        if (record.parcela_id) {
          await supabase.from('parcelas_contrato').update({ valor }).eq('id', record.parcela_id);
        }
      } else {
        const { error } = await supabase.from('controle_beneficios').insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }

      toast({ title: 'Sucesso', description: record ? 'Benefício atualizado.' : 'Benefício criado.' });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar benefício:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{record ? 'Editar Benefício' : 'Novo Benefício'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Fornecedor *</Label>
            <FornecedorSelect value={fornecedorId} onChange={setFornecedorId} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Benefício</Label>
              <Select value={tipoBeneficio} onValueChange={setTipoBeneficio}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tiposBeneficio.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor</Label>
              <CurrencyInput value={valor} onChange={setValor} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição do benefício..." />
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
            {saving ? 'Salvando...' : record ? 'Salvar Alterações' : 'Criar Benefício'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
