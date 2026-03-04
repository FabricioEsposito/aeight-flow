import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { FileUpload } from '@/components/ui/file-upload';
import type { FolhaParcelaRecord } from './FolhaPagamentoTab';

const SALARIO_CLT_IDS = [
  '30a56eb0-cfba-4e09-9f43-bf3cd39873bc', // 2.1.2 - Salário CLT
  'c1b3c1bf-c014-46f0-baa7-cdea1c3b0ac7', // 3.1.1 - Salário CLT
];

interface EditFolhaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: FolhaParcelaRecord | null;
  defaultMes: number;
  defaultAno: number;
  onSaved: () => void;
}

export function EditFolhaDialog({ open, onOpenChange, record, defaultMes, defaultAno, onSaved }: EditFolhaDialogProps) {
  const [observacoes, setObservacoes] = useState('');
  const [dataVencimento, setDataVencimento] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState('pendente');
  const [holerite_url, setHoleriteUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { permissions } = useUserRole();

  const isSalarioCLT = record?.plano_contas_id && SALARIO_CLT_IDS.includes(record.plano_contas_id);

  useEffect(() => {
    if (!open) return;

    if (record?.folha_id) {
      loadFolhaData(record.folha_id);
      setDataVencimento(new Date(record.data_vencimento + 'T00:00:00'));
    } else {
      resetForm();
      if (record) {
        setDataVencimento(new Date(record.data_vencimento + 'T00:00:00'));
      }
    }
  }, [record, open]);

  const loadFolhaData = async (folhaId: string) => {
    const { data } = await supabase
      .from('folha_pagamento')
      .select('*')
      .eq('id', folhaId)
      .single();

    if (data) {
      setObservacoes(data.observacoes || '');
      setStatus(data.status);
      setHoleriteUrl((data as any).holerite_url || null);
    }
  };

  const resetForm = () => {
    setObservacoes('');
    setDataVencimento(undefined);
    setStatus('pendente');
    setHoleriteUrl(null);
  };

  const handleSave = async () => {
    if (!record) return;

    const needsApproval = permissions.needsApprovalForRH;
    setSaving(true);
    try {
      const newDataVencimento = dataVencimento
        ? `${dataVencimento.getFullYear()}-${String(dataVencimento.getMonth() + 1).padStart(2, '0')}-${String(dataVencimento.getDate()).padStart(2, '0')}`
        : record.data_vencimento;

      const vencDate = new Date(newDataVencimento + 'T00:00:00');
      const mesRef = vencDate.getMonth() + 1;
      const anoRef = vencDate.getFullYear();

      const valorLiquido = record.valor;

      const payload: any = {
        fornecedor_id: record.fornecedor_id,
        contrato_id: record.contrato_id,
        parcela_id: record.parcela_id,
        mes_referencia: mesRef,
        ano_referencia: anoRef,
        tipo_vinculo: record.tipo_vinculo,
        salario_base: record.salario_base,
        valor_liquido: valorLiquido,
        observacoes: observacoes || null,
        status: needsApproval ? 'pendente_aprovacao_rh' : status,
        holerite_url: isSalarioCLT ? holerite_url : null,
      };

      // If analyst needs approval, create solicitacao
      if (needsApproval && user) {
        const { data: solData } = await supabase
          .from('solicitacoes_aprovacao_rh')
          .insert({
            solicitante_id: user.id,
            tipo: 'edicao_individual',
            descricao: `Edição de folha: ${record.fornecedor_razao_social}`,
            detalhes: [{
              parcela_id: record.parcela_id,
              razao_social: record.fornecedor_razao_social,
              cnpj: record.fornecedor_cnpj,
              salario_base: record.salario_base,
              valor_liquido: valorLiquido,
              data_vencimento: newDataVencimento,
            }] as any,
            mes_referencia: mesRef,
            ano_referencia: anoRef,
          } as any)
          .select('id')
          .single();

        if (solData?.id) payload.solicitacao_rh_id = solData.id;
      }

      if (record.folha_id) {
        const { error } = await supabase.from('folha_pagamento').update(payload).eq('id', record.folha_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('folha_pagamento').insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }

      // Only propagate if NOT needing approval
      if (!needsApproval) {
        await supabase.from('parcelas_contrato').update({ data_vencimento: newDataVencimento }).eq('id', record.parcela_id);
        if (record.conta_pagar_id) {
          await supabase.from('contas_pagar').update({ data_vencimento: newDataVencimento, data_competencia: newDataVencimento }).eq('id', record.conta_pagar_id);
        }
      }

      toast({ 
        title: needsApproval ? 'Enviado para aprovação' : 'Sucesso', 
        description: needsApproval ? 'Alteração enviada para aprovação do Gerente de RH.' : 'Folha de pagamento salva com sucesso.' 
      });
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
          <div>
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
                  {dataVencimento ? format(dataVencimento, "dd/MM/yyyy") : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataVencimento}
                  onSelect={setDataVencimento}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {record && (
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
              <span className="font-semibold">Valor da Parcela:</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(record.valor)}</span>
            </div>
          )}

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

          {isSalarioCLT && (
            <FileUpload
              bucket="holerites"
              path={`holerites/${record?.parcela_id}.pdf`}
              value={holerite_url}
              onChange={setHoleriteUrl}
              accept="application/pdf,.pdf"
              maxSizeMB={10}
              label="Holerite (PDF)"
            />
          )}
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
