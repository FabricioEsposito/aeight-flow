import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Copy, X, Trash2, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { ServicoSelect } from '@/components/contratos/ServicoSelect';
import { PlanoContasSelect } from '@/components/contratos/PlanoContasSelect';

interface ContaBancaria {
  id: string;
  descricao: string;
}

interface BatchActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  actionType: 'change-date' | 'mark-paid' | 'clone' | 'delete' | 'change-bank-account' | 'change-service' | 'change-category' | null;
  onConfirm: (data: any) => void;
  tipo?: 'entrada' | 'saida';
  allPaid?: boolean;
}

export function BatchActionsDialog({
  open,
  onOpenChange,
  selectedCount,
  actionType,
  onConfirm,
  tipo,
  allPaid = false,
}: BatchActionsDialogProps) {
  const [newDate, setNewDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [contaBancariaId, setContaBancariaId] = useState('');
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [servicoId, setServicoId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');

  useEffect(() => {
    if (open && actionType === 'change-bank-account') {
      fetchContasBancarias();
    }
  }, [open, actionType]);

  const fetchContasBancarias = async () => {
    const { data } = await supabase
      .from('contas_bancarias')
      .select('id, descricao')
      .eq('status', 'ativo')
      .order('descricao');
    setContasBancarias(data || []);
  };

  const getTitle = () => {
    switch (actionType) {
      case 'change-date': return 'Alterar Data de Vencimento';
      case 'mark-paid':
        if (allPaid) return 'Voltar para Em Aberto';
        return tipo === 'entrada' ? 'Marcar como Recebido' : 'Marcar como Pago';
      case 'clone': return 'Clonar Lançamentos';
      case 'delete': return 'Excluir Lançamentos';
      case 'change-bank-account': return 'Alterar Conta Bancária';
      case 'change-service': return 'Alterar Serviço';
      case 'change-category': return 'Alterar Categoria';
      default: return 'Ação em Lote';
    }
  };

  const getDescription = () => {
    switch (actionType) {
      case 'change-date': return `Alterar a data de vencimento de ${selectedCount} lançamento(s) selecionado(s)`;
      case 'mark-paid':
        if (allPaid) return `Voltar ${selectedCount} lançamento(s) para status em aberto?`;
        return `Marcar ${selectedCount} lançamento(s) como ${tipo === 'entrada' ? 'recebido' : 'pago'}?`;
      case 'clone': return `Deseja clonar ${selectedCount} lançamento(s) selecionado(s)?`;
      case 'delete': return `Tem certeza que deseja excluir ${selectedCount} lançamento(s)? Esta ação não pode ser desfeita.`;
      case 'change-bank-account': return `Alterar a conta bancária de ${selectedCount} lançamento(s) selecionado(s). As parcelas vinculadas a contratos também serão atualizadas.`;
      case 'change-service': return `Alterar o serviço de ${selectedCount} lançamento(s) selecionado(s).`;
      case 'change-category': return `Alterar a categoria (plano de contas) de ${selectedCount} lançamento(s) selecionado(s).`;
      default: return '';
    }
  };

  const handleConfirm = () => {
    if (actionType === 'change-date') {
      onConfirm({ newDate });
    } else if (actionType === 'mark-paid') {
      onConfirm({ paymentDate });
    } else if (actionType === 'change-bank-account') {
      onConfirm({ contaBancariaId });
    } else if (actionType === 'change-service') {
      onConfirm({ servicoId: servicoId || null });
    } else if (actionType === 'change-category') {
      onConfirm({ categoriaId });
    } else {
      onConfirm({});
    }
    setNewDate('');
    setPaymentDate('');
    setContaBancariaId('');
    setServicoId('');
    setCategoriaId('');
    onOpenChange(false);
  };

  const isDisabled = () => {
    if (actionType === 'change-date' && !newDate) return true;
    if (actionType === 'mark-paid' && !allPaid && !paymentDate) return true;
    if (actionType === 'change-bank-account' && !contaBancariaId) return true;
    if (actionType === 'change-category' && !categoriaId) return true;
    // change-service allows empty (remove service)
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">{getDescription()}</p>

          {actionType === 'change-date' && (
            <div className="space-y-2">
              <Label htmlFor="new-date">Nova Data de Vencimento</Label>
              <Input id="new-date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
          )}

          {actionType === 'mark-paid' && !allPaid && (
            <div className="space-y-2">
              <Label htmlFor="payment-date">Data da Baixa</Label>
              <Input id="payment-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
          )}

          {actionType === 'change-bank-account' && (
            <div className="space-y-2">
              <Label htmlFor="conta-bancaria">Nova Conta Bancária</Label>
              <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta bancária" />
                </SelectTrigger>
                <SelectContent>
                  {contasBancarias.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>{conta.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {actionType === 'change-service' && (
            <div className="space-y-2">
              <Label>Novo Serviço</Label>
              <ServicoSelect value={servicoId} onChange={setServicoId} showNoneOption />
            </div>
          )}

          {actionType === 'change-category' && (
            <div className="space-y-2">
              <Label>Nova Categoria</Label>
              <PlanoContasSelect value={categoriaId} onChange={setCategoriaId} />
            </div>
          )}

          {actionType === 'delete' && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Atenção: Os lançamentos vinculados a contratos também terão suas parcelas excluídas.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            variant={actionType === 'delete' ? 'destructive' : 'default'}
            disabled={isDisabled()}
          >
            {actionType === 'delete' ? 'Excluir' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
