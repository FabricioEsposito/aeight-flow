import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, Undo2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CurrencyInput, PercentageInput } from '@/components/ui/currency-input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function EditarContrato() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goLiveDialogOpen, setGoLiveDialogOpen] = useState(false);
  const [selectedParcelaId, setSelectedParcelaId] = useState<string | null>(null);
  const [diaVencimento, setDiaVencimento] = useState(5);
  
  // Dados do contrato
  const [quantidade, setQuantidade] = useState(1);
  const [valorUnitario, setValorUnitario] = useState(0);
  const [descontoTipo, setDescontoTipo] = useState<'percentual' | 'valor'>('percentual');
  const [descontoPercentual, setDescontoPercentual] = useState(0);
  const [descontoValor, setDescontoValor] = useState(0);
  const [irrfPercentual, setIrrfPercentual] = useState(0);
  const [pisPercentual, setPisPercentual] = useState(0);
  const [cofinsPercentual, setCofinsPercentual] = useState(0);
  const [csllPercentual, setCsllPercentual] = useState(0);
  const [descricaoServico, setDescricaoServico] = useState('');
  const [parcelas, setParcelas] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchContrato();
      fetchParcelas();
    }
  }, [id]);

  // Não recalcular automaticamente - manter valores específicos das parcelas
  // useEffect(() => {
  //   if (parcelas.length > 0 && valorUnitario > 0) {
  //     recalcularParcelas();
  //   }
  // }, [quantidade, valorUnitario, descontoPercentual, descontoValor, descontoTipo, irrfPercentual, pisPercentual, cofinsPercentual, csllPercentual]);

  const fetchContrato = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setQuantidade(data.quantidade || 1);
      setValorUnitario(data.valor_unitario || 0);
      setDescontoTipo((data.desconto_tipo as 'percentual' | 'valor') || 'percentual');
      setDescontoPercentual(data.desconto_percentual || 0);
      setDescontoValor(data.desconto_valor || 0);
      setIrrfPercentual(data.irrf_percentual || 0);
      setPisPercentual(data.pis_percentual || 0);
      setCofinsPercentual(data.cofins_percentual || 0);
      setCsllPercentual(data.csll_percentual || 0);
      setDescricaoServico(data.descricao_servico || '');
      
      // Buscar dia de vencimento do contrato (calcular baseado na primeira parcela)
      const { data: primeiraParcelaData } = await supabase
        .from('parcelas_contrato')
        .select('data_vencimento')
        .eq('contrato_id', id)
        .eq('numero_parcela', 1)
        .single();
      
      if (primeiraParcelaData && data.data_inicio) {
        const dataInicio = new Date(data.data_inicio);
        const dataVenc = new Date(primeiraParcelaData.data_vencimento);
        const diffTime = Math.abs(dataVenc.getTime() - dataInicio.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDiaVencimento(diffDays);
      }
    } catch (error) {
      console.error('Erro ao buscar contrato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o contrato.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchParcelas = async () => {
    try {
      const { data, error } = await supabase
        .from('parcelas_contrato')
        .select(`
          *,
          contas_receber:contas_receber!parcela_id(descricao),
          contas_pagar:contas_pagar!parcela_id(descricao)
        `)
        .eq('contrato_id', id)
        .order('numero_parcela', { ascending: true });

      if (error) throw error;
      
      // Adicionar flag isGoLive para identificar parcelas Go Live concluídas
      const parcelasComFlag = (data || []).map(parcela => ({
        ...parcela,
        isGoLive: (
          (Array.isArray(parcela.contas_receber) && parcela.contas_receber.length > 0 && parcela.contas_receber[0]?.descricao?.includes('Go Live')) ||
          (Array.isArray(parcela.contas_pagar) && parcela.contas_pagar.length > 0 && parcela.contas_pagar[0]?.descricao?.includes('Go Live'))
        )
      }));
      
      setParcelas(parcelasComFlag);
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error);
    }
  };

  const handleOpenGoLiveDialog = (parcelaId: string) => {
    setSelectedParcelaId(parcelaId);
    setGoLiveDialogOpen(true);
  };

  const handleConfirmGoLive = async () => {
    if (!selectedParcelaId) return;

    try {
      // Buscar informações do contrato e da parcela
      const { data: parcela, error: parcelaError } = await supabase
        .from('parcelas_contrato')
        .select('*, contratos(*)')
        .eq('id', selectedParcelaId)
        .single();

      if (parcelaError) throw parcelaError;

      // Calcular data de vencimento baseada na data atual + dias de vencimento do contrato
      const dataGoLive = new Date();
      const dataVencimento = new Date(dataGoLive);
      dataVencimento.setDate(dataVencimento.getDate() + diaVencimento);

      // Atualizar status da parcela para pendente e data de vencimento
      const { error: updateError } = await supabase
        .from('parcelas_contrato')
        .update({ 
          status: 'pendente',
          data_vencimento: dataVencimento.toISOString().split('T')[0]
        })
        .eq('id', selectedParcelaId);

      if (updateError) throw updateError;

      // Criar lançamento em contas a receber/pagar
      const contrato = parcela.contratos;
      if (contrato.tipo_contrato === 'venda') {
        const { error: receberError } = await supabase
          .from('contas_receber')
          .insert({
            parcela_id: selectedParcelaId,
            cliente_id: contrato.cliente_id,
            valor: parcela.valor,
            valor_original: parcela.valor,
            data_vencimento: dataVencimento.toISOString().split('T')[0],
            data_competencia: new Date().toISOString().split('T')[0],
            plano_conta_id: contrato.plano_contas_id,
            conta_bancaria_id: parcela.conta_bancaria_id,
            centro_custo: contrato.centro_custo,
            status: 'pendente',
            descricao: `Parcela ${parcela.numero_parcela} - Contrato ${contrato.numero_contrato} - Go Live`,
            juros: 0,
            multa: 0,
            desconto: 0
          });

        if (receberError) throw receberError;
      } else {
        const { error: pagarError } = await supabase
          .from('contas_pagar')
          .insert({
            parcela_id: selectedParcelaId,
            fornecedor_id: contrato.fornecedor_id,
            valor: parcela.valor,
            valor_original: parcela.valor,
            data_vencimento: dataVencimento.toISOString().split('T')[0],
            data_competencia: new Date().toISOString().split('T')[0],
            plano_conta_id: contrato.plano_contas_id,
            conta_bancaria_id: parcela.conta_bancaria_id,
            centro_custo: contrato.centro_custo,
            status: 'pendente',
            descricao: `Parcela ${parcela.numero_parcela} - Contrato ${contrato.numero_contrato} - Go Live`,
            juros: 0,
            multa: 0,
            desconto: 0
          });

        if (pagarError) throw pagarError;
      }

      toast({
        title: "Sucesso",
        description: "Parcela Go Live lançada com sucesso!",
      });

      setGoLiveDialogOpen(false);
      setSelectedParcelaId(null);
      fetchParcelas();
    } catch (error) {
      console.error('Erro ao concluir Go Live:', error);
      toast({
        title: "Erro",
        description: "Não foi possível concluir o Go Live.",
        variant: "destructive",
      });
    }
  };

  const handleReverterGoLive = async (parcelaId: string) => {
    try {
      // Atualizar status da parcela de volta para aguardando_conclusao
      const { error: updateError } = await supabase
        .from('parcelas_contrato')
        .update({ 
          status: 'aguardando_conclusao'
          // Mantém a data_vencimento pois o campo não aceita null
        })
        .eq('id', parcelaId);

      if (updateError) throw updateError;

      // Remover lançamento em contas a receber/pagar
      await supabase
        .from('contas_receber')
        .delete()
        .eq('parcela_id', parcelaId);

      await supabase
        .from('contas_pagar')
        .delete()
        .eq('parcela_id', parcelaId);

      toast({
        title: "Sucesso",
        description: "Parcela revertida para Go Live!",
      });

      fetchParcelas();
    } catch (error) {
      console.error('Erro ao reverter Go Live:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reverter o Go Live.",
        variant: "destructive",
      });
    }
  };

  const calcularValorTotal = () => {
    const valorBase = quantidade * valorUnitario;
    const desconto = descontoTipo === 'percentual' 
      ? valorBase * (descontoPercentual / 100)
      : descontoValor;
    const valorComDesconto = valorBase - desconto;
    const totalImpostos = (irrfPercentual + pisPercentual + cofinsPercentual + csllPercentual) / 100;
    const valorImpostos = valorComDesconto * totalImpostos;
    return valorComDesconto - valorImpostos;
  };

  const recalcularParcelas = () => {
    const novoValorTotal = calcularValorTotal();
    const numeroParcelas = parcelas.length;
    
    if (numeroParcelas === 0) return;

    const valorPorParcela = novoValorTotal / numeroParcelas;

    const parcelasAtualizadas = parcelas.map((parcela) => ({
      ...parcela,
      valor: valorPorParcela
    }));

    setParcelas(parcelasAtualizadas);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const valorTotal = calcularValorTotal();

      const { error: contratoError } = await supabase
        .from('contratos')
        .update({
          quantidade,
          valor_unitario: valorUnitario,
          desconto_tipo: descontoTipo,
          desconto_percentual: descontoPercentual,
          desconto_valor: descontoValor,
          irrf_percentual: irrfPercentual,
          pis_percentual: pisPercentual,
          cofins_percentual: cofinsPercentual,
          pis_cofins_percentual: pisPercentual + cofinsPercentual,
          csll_percentual: csllPercentual,
          valor_total: valorTotal,
          descricao_servico: descricaoServico,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (contratoError) throw contratoError;

      // Atualizar parcelas
      for (const parcela of parcelas) {
        const { error: parcelaError } = await supabase
          .from('parcelas_contrato')
          .update({
            data_vencimento: parcela.data_vencimento,
            valor: parcela.valor,
          })
          .eq('id', parcela.id);

        if (parcelaError) throw parcelaError;
      }

      toast({
        title: "Sucesso",
        description: "Contrato atualizado com sucesso!",
      });

      navigate(`/contratos/${id}`);
    } catch (error) {
      console.error('Erro ao salvar contrato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleParcelaChange = (index: number, field: string, value: any) => {
    const newParcelas = [...parcelas];
    newParcelas[index] = { ...newParcelas[index], [field]: value };
    setParcelas(newParcelas);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/contratos/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Editar Valores e Parcelas</h1>
          <p className="text-muted-foreground">Atualize valores, impostos e parcelas do contrato</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/contratos/${id}/edit-completo`)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar contrato completo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Valores e Impostos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input 
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Unitário (R$)</Label>
              <CurrencyInput value={valorUnitario} onChange={setValorUnitario} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Desconto (%)</Label>
              <PercentageInput value={descontoPercentual} onChange={setDescontoPercentual} />
            </div>

            <div className="space-y-2">
              <Label>Desconto (R$)</Label>
              <CurrencyInput value={descontoValor} onChange={setDescontoValor} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>IRRF (%)</Label>
              <PercentageInput value={irrfPercentual} onChange={setIrrfPercentual} />
            </div>

            <div className="space-y-2">
              <Label>PIS (%)</Label>
              <PercentageInput value={pisPercentual} onChange={setPisPercentual} />
            </div>

            <div className="space-y-2">
              <Label>COFINS (%)</Label>
              <PercentageInput value={cofinsPercentual} onChange={setCofinsPercentual} />
            </div>

            <div className="space-y-2">
              <Label>CSLL (%)</Label>
              <PercentageInput value={csllPercentual} onChange={setCsllPercentual} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição do Serviço</Label>
            <Textarea 
              value={descricaoServico}
              onChange={(e) => setDescricaoServico(e.target.value)}
              rows={4}
              placeholder="Descreva o serviço..."
            />
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Valor Total Calculado:</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(calcularValorTotal())}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Editar Parcelas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parcela</TableHead>
                <TableHead>Data Vencimento</TableHead>
                <TableHead>Valor (R$)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((parcela, index) => (
                <TableRow key={parcela.id}>
                  <TableCell>{parcela.numero_parcela}</TableCell>
                  <TableCell>
                    {parcela.status === 'aguardando_conclusao' ? (
                      <span className="text-muted-foreground">Aguardando Go Live</span>
                    ) : (
                      <Input 
                        type="date"
                        value={parcela.data_vencimento}
                        onChange={(e) => handleParcelaChange(index, 'data_vencimento', e.target.value)}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <CurrencyInput 
                      value={parcela.valor}
                      onChange={(value) => handleParcelaChange(index, 'valor', value)}
                    />
                  </TableCell>
                  <TableCell>
                    {parcela.status === 'aguardando_conclusao' ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Go Live
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        {parcela.status === 'pendente' ? 'Pendente' : parcela.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {parcela.status === 'aguardando_conclusao' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenGoLiveDialog(parcela.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Concluir Go Live
                      </Button>
                    ) : (parcela as any).isGoLive && parcela.status === 'pendente' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReverterGoLive(parcela.id)}
                      >
                        <Undo2 className="h-4 w-4 mr-2" />
                        Reverter para Go Live
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => navigate(`/contratos/${id}`)}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      <AlertDialog open={goLiveDialogOpen} onOpenChange={setGoLiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Conclusão do Go Live</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente marcar esta parcela como concluída? Isso irá lançá-la em contas a {parcelas.find(p => p.id === selectedParcelaId)?.tipo === 'receber' ? 'receber' : 'pagar'}.
              <br /><br />
              <strong>Importante:</strong> A data de vencimento será calculada a partir de hoje ({new Date().toLocaleDateString('pt-BR')}) + {diaVencimento} dias = {new Date(new Date().setDate(new Date().getDate() + diaVencimento)).toLocaleDateString('pt-BR')}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setGoLiveDialogOpen(false);
              setSelectedParcelaId(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGoLive}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
