import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CentroCustoSelect from '@/components/centro-custos/CentroCustoSelect';
import { Loader2 } from 'lucide-react';

interface BatchEditContratosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSuccess: () => void;
}

interface ContaBancaria {
  id: string;
  descricao: string;
  banco: string;
}

interface Vendedor {
  id: string;
  nome: string;
}

export function BatchEditContratosDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: BatchEditContratosDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);

  // Field values
  const [contaBancariaId, setContaBancariaId] = useState<string>('');
  const [centroCusto, setCentroCusto] = useState<string>('');
  const [importancia, setImportancia] = useState<string>('');
  const [vendedorResponsavel, setVendedorResponsavel] = useState<string>('');

  // Field enabled state
  const [updateContaBancaria, setUpdateContaBancaria] = useState(false);
  const [updateCentroCusto, setUpdateCentroCusto] = useState(false);
  const [updateImportancia, setUpdateImportancia] = useState(false);
  const [updateVendedor, setUpdateVendedor] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
      // Reset fields when dialog opens
      setContaBancariaId('');
      setCentroCusto('');
      setImportancia('');
      setVendedorResponsavel('');
      setUpdateContaBancaria(false);
      setUpdateCentroCusto(false);
      setUpdateImportancia(false);
      setUpdateVendedor(false);
    }
  }, [open]);

  const fetchData = async () => {
    const [contasRes, vendedoresRes] = await Promise.all([
      supabase.from('contas_bancarias').select('id, descricao, banco').eq('status', 'ativo'),
      supabase.from('vendedores').select('id, nome').eq('status', 'ativo'),
    ]);

    setContasBancarias(contasRes.data || []);
    setVendedores(vendedoresRes.data || []);
  };

  const handleSubmit = async () => {
    if (!updateContaBancaria && !updateCentroCusto && !updateImportancia && !updateVendedor) {
      toast({
        title: 'Atenção',
        description: 'Selecione pelo menos um campo para atualizar.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const updates: Record<string, any> = {};

      if (updateContaBancaria && contaBancariaId) {
        updates.conta_bancaria_id = contaBancariaId;
      }
      if (updateCentroCusto) {
        updates.centro_custo = centroCusto || null;
      }
      if (updateImportancia && importancia) {
        updates.importancia_cliente_fornecedor = importancia;
      }
      if (updateVendedor) {
        updates.vendedor_responsavel = vendedorResponsavel || null;
      }

      if (Object.keys(updates).length === 0) {
        toast({
          title: 'Atenção',
          description: 'Preencha pelo menos um campo para atualizar.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // 1. Atualizar os contratos
      const { error } = await supabase
        .from('contratos')
        .update(updates)
        .in('id', selectedIds);

      if (error) throw error;

      // 2. Buscar as parcelas vinculadas a esses contratos
      const { data: parcelas } = await supabase
        .from('parcelas_contrato')
        .select('id, contrato_id')
        .in('contrato_id', selectedIds);

      if (parcelas && parcelas.length > 0) {
        const parcelaIds = parcelas.map(p => p.id);

        // 3. Atualizar parcelas_contrato com conta_bancaria_id se alterado
        if (updateContaBancaria && contaBancariaId) {
          await supabase
            .from('parcelas_contrato')
            .update({ conta_bancaria_id: contaBancariaId })
            .in('id', parcelaIds);
        }

        // 4. Preparar atualizações para contas_receber e contas_pagar
        const contasUpdates: Record<string, any> = {};
        if (updateContaBancaria && contaBancariaId) {
          contasUpdates.conta_bancaria_id = contaBancariaId;
        }
        if (updateCentroCusto) {
          contasUpdates.centro_custo = centroCusto || null;
        }

        if (Object.keys(contasUpdates).length > 0) {
          // 5. Atualizar contas_receber vinculadas às parcelas
          await supabase
            .from('contas_receber')
            .update(contasUpdates)
            .in('parcela_id', parcelaIds);

          // 6. Atualizar contas_pagar vinculadas às parcelas
          await supabase
            .from('contas_pagar')
            .update(contasUpdates)
            .in('parcela_id', parcelaIds);
        }
      }

      toast({
        title: 'Sucesso',
        description: `${selectedIds.length} contrato(s) e lançamentos relacionados atualizados com sucesso!`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar contratos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar os contratos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Alteração em Lote</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {selectedIds.length} contrato(s) selecionado(s). Marque os campos que deseja alterar.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Conta Bancária */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="update-conta-bancaria"
                checked={updateContaBancaria}
                onCheckedChange={(checked) => setUpdateContaBancaria(checked === true)}
              />
              <Label htmlFor="update-conta-bancaria" className="font-medium cursor-pointer">
                Conta Bancária
              </Label>
            </div>
            {updateContaBancaria && (
              <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta bancária" />
                </SelectTrigger>
                <SelectContent>
                  {contasBancarias.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.descricao} - {conta.banco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Centro de Custo */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="update-centro-custo"
                checked={updateCentroCusto}
                onCheckedChange={(checked) => setUpdateCentroCusto(checked === true)}
              />
              <Label htmlFor="update-centro-custo" className="font-medium cursor-pointer">
                Centro de Custo
              </Label>
            </div>
            {updateCentroCusto && (
              <CentroCustoSelect
                value={centroCusto}
                onValueChange={setCentroCusto}
                placeholder="Selecione o centro de custo"
              />
            )}
          </div>

          {/* Importância */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="update-importancia"
                checked={updateImportancia}
                onCheckedChange={(checked) => setUpdateImportancia(checked === true)}
              />
              <Label htmlFor="update-importancia" className="font-medium cursor-pointer">
                Importância
              </Label>
            </div>
            {updateImportancia && (
              <Select value={importancia} onValueChange={setImportancia}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a importância" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="importante">Importante</SelectItem>
                  <SelectItem value="mediano">Mediano</SelectItem>
                  <SelectItem value="nao_importante">Não Importante</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Vendedor */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="update-vendedor"
                checked={updateVendedor}
                onCheckedChange={(checked) => setUpdateVendedor(checked === true)}
              />
              <Label htmlFor="update-vendedor" className="font-medium cursor-pointer">
                Vendedor Responsável
              </Label>
            </div>
            {updateVendedor && (
              <Select value={vendedorResponsavel} onValueChange={setVendedorResponsavel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {vendedores.map((vendedor) => (
                    <SelectItem key={vendedor.id} value={vendedor.id}>
                      {vendedor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Aplicar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
