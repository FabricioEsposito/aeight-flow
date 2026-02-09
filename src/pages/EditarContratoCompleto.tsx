import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, MoreVertical, X, CheckCircle, Undo2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ClienteSelect } from '@/components/contratos/ClienteSelect';
import { FornecedorSelect } from '@/components/contratos/FornecedorSelect';
import { PlanoContasSelect } from '@/components/contratos/PlanoContasSelect';
import { VendedorSelect } from '@/components/contratos/VendedorSelect';
import CentroCustoSelect from '@/components/centro-custos/CentroCustoSelect';
import { DateInput } from '@/components/ui/date-input';
import { CurrencyInput, PercentageInput } from '@/components/ui/currency-input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function EditarContratoCompleto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [goLiveDialogOpen, setGoLiveDialogOpen] = useState(false);
  const [selectedParcelaId, setSelectedParcelaId] = useState<string | null>(null);
  const [diaVencimento, setDiaVencimento] = useState(5);

  // Dados do contrato
  const [numeroContrato, setNumeroContrato] = useState('');
  const [tipoContrato, setTipoContrato] = useState<'venda' | 'compra'>('venda');
  const [clienteId, setClienteId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [recorrente, setRecorrente] = useState(false);
  const [periodoRecorrencia, setPeriodoRecorrencia] = useState('');
  const [planoContasId, setPlanoContasId] = useState('');
  const [centroCustoId, setCentroCustoId] = useState('');
  const [vendedorId, setVendedorId] = useState('');
  const prevCentroCustoRef = useRef<string>('');
  const [descricaoServico, setDescricaoServico] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [valorUnitario, setValorUnitario] = useState(0);
  const [descontoTipo, setDescontoTipo] = useState<'percentual' | 'valor'>('percentual');
  const [descontoPercentual, setDescontoPercentual] = useState(0);
  const [descontoValor, setDescontoValor] = useState(0);
  const [irrfPercentual, setIrrfPercentual] = useState(0);
  const [pisPercentual, setPisPercentual] = useState(0);
  const [cofinsPercentual, setCofinsPercentual] = useState(0);
  const [csllPercentual, setCsllPercentual] = useState(0);
  const [tipoPagamento, setTipoPagamento] = useState('');
  const [contaBancariaId, setContaBancariaId] = useState('');
  const [linkContrato, setLinkContrato] = useState('');
  const [observacoesFaturamento, setObservacoesFaturamento] = useState('');
  const [importanciaClienteFornecedor, setImportanciaClienteFornecedor] = useState<'importante' | 'mediano' | 'nao_importante'>('mediano');
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [avisoPrevioDias, setAvisoPrevioDias] = useState(0);
  const [renovacaoAutomatica, setRenovacaoAutomatica] = useState(false);
  const [ajusteIpca, setAjusteIpca] = useState(false);
  const [parcelas, setParcelas] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchContrato();
      fetchContasBancarias();
      fetchParcelas();
    }
  }, [id]);

  // When changing centro de custo, force reselect vendor
  useEffect(() => {
    const prev = prevCentroCustoRef.current;
    if (prev && prev !== centroCustoId && vendedorId) {
      setVendedorId('');
    }
    prevCentroCustoRef.current = centroCustoId;
  }, [centroCustoId, vendedorId]);

  // Recalculate parcels when values change
  useEffect(() => {
    if (parcelas.length > 0 && valorUnitario > 0) {
      recalcularParcelas();
    }
  }, [quantidade, valorUnitario, descontoPercentual, descontoValor, descontoTipo, irrfPercentual, pisPercentual, cofinsPercentual, csllPercentual]);

  const fetchContasBancarias = async () => {
    const { data } = await supabase
      .from('contas_bancarias')
      .select('*')
      .eq('status', 'ativo')
      .order('descricao');
    setContasBancarias(data || []);
  };

  const fetchContrato = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setNumeroContrato(data.numero_contrato);
      setTipoContrato(data.tipo_contrato as 'venda' | 'compra');
      setClienteId(data.cliente_id || '');
      setFornecedorId(data.fornecedor_id || '');
      setDataInicio(data.data_inicio ? new Date(data.data_inicio + 'T00:00:00') : null);
      setDataFim(data.data_fim ? new Date(data.data_fim + 'T00:00:00') : null);
      setRecorrente(data.recorrente || false);
      setPeriodoRecorrencia(data.periodo_recorrencia || '');
      setPlanoContasId(data.plano_contas_id || '');
      setCentroCustoId(data.centro_custo || '');
      setVendedorId(data.vendedor_responsavel || '');
      setDescricaoServico(data.descricao_servico || '');
      setQuantidade(data.quantidade || 1);
      setValorUnitario(data.valor_unitario || 0);
      setDescontoTipo((data.desconto_tipo as 'percentual' | 'valor') || 'percentual');
      setDescontoPercentual(data.desconto_percentual || 0);
      setDescontoValor(data.desconto_valor || 0);
      setIrrfPercentual(data.irrf_percentual || 0);
      setPisPercentual(data.pis_percentual || 0);
      setCofinsPercentual(data.cofins_percentual || 0);
      setCsllPercentual(data.csll_percentual || 0);
      setTipoPagamento(data.tipo_pagamento || '');
      setContaBancariaId(data.conta_bancaria_id || '');
      setLinkContrato(data.link_contrato || '');
      setObservacoesFaturamento(data.observacoes_faturamento || '');
      setImportanciaClienteFornecedor(data.importancia_cliente_fornecedor || 'mediano');
      setAvisoPrevioDias(data.aviso_previo_dias || 0);
      setRenovacaoAutomatica(data.renovacao_automatica || false);
      setAjusteIpca(data.ajuste_ipca || false);

      // Calculate dia vencimento from first parcela
      const { data: primeiraParcelaData } = await supabase
        .from('parcelas_contrato')
        .select('data_vencimento')
        .eq('contrato_id', id)
        .eq('numero_parcela', 1)
        .single();

      if (primeiraParcelaData && data.data_inicio) {
        const dataInicioDate = new Date(data.data_inicio + 'T00:00:00');
        const dataVenc = new Date(primeiraParcelaData.data_vencimento + 'T00:00:00');
        const diffTime = Math.abs(dataVenc.getTime() - dataInicioDate.getTime());
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
    const numeroParcelas = parcelas.length;
    if (numeroParcelas === 0) return;

    let valorPorParcela: number;

    if (recorrente) {
      const valorBase = quantidade * valorUnitario;
      const desconto = descontoTipo === 'percentual'
        ? valorBase * (descontoPercentual / 100)
        : descontoValor;
      const valorComDesconto = valorBase - desconto;
      const totalImpostos = (irrfPercentual + pisPercentual + cofinsPercentual + csllPercentual) / 100;
      valorPorParcela = valorComDesconto - (valorComDesconto * totalImpostos);
    } else {
      const novoValorTotal = calcularValorTotal();
      valorPorParcela = novoValorTotal / numeroParcelas;
    }

    const parcelasAtualizadas = parcelas.map((parcela) => ({
      ...parcela,
      valor: valorPorParcela
    }));

    setParcelas(parcelasAtualizadas);
  };

  const handleParcelaChange = (index: number, field: string, value: any) => {
    const newParcelas = [...parcelas];
    newParcelas[index] = { ...newParcelas[index], [field]: value };
    setParcelas(newParcelas);
  };

  const handleOpenGoLiveDialog = (parcelaId: string) => {
    setSelectedParcelaId(parcelaId);
    setGoLiveDialogOpen(true);
  };

  const handleConfirmGoLive = async () => {
    if (!selectedParcelaId) return;

    try {
      const { data: parcela, error: parcelaError } = await supabase
        .from('parcelas_contrato')
        .select('*, contratos(*)')
        .eq('id', selectedParcelaId)
        .single();

      if (parcelaError) throw parcelaError;

      const dataGoLive = new Date();
      const dataVencimento = new Date(dataGoLive);
      dataVencimento.setDate(dataVencimento.getDate() + diaVencimento);

      const contrato = parcela.contratos;
      const dataInicioDate = new Date(contrato.data_inicio + 'T00:00:00');
      let dataCompetencia = new Date(dataInicioDate);

      if (contrato.recorrente && contrato.periodo_recorrencia) {
        const mesesParaAdicionar = {
          'mensal': (parcela.numero_parcela - 1),
          'trimestral': (parcela.numero_parcela - 1) * 3,
          'semestral': (parcela.numero_parcela - 1) * 6,
          'anual': (parcela.numero_parcela - 1) * 12
        }[contrato.periodo_recorrencia] || (parcela.numero_parcela - 1);

        dataCompetencia.setMonth(dataCompetencia.getMonth() + mesesParaAdicionar);
      } else {
        dataCompetencia.setMonth(dataCompetencia.getMonth() + (parcela.numero_parcela - 1));
      }

      const { error: updateError } = await supabase
        .from('parcelas_contrato')
        .update({
          status: 'pendente',
          data_vencimento: dataVencimento.toISOString().split('T')[0]
        })
        .eq('id', selectedParcelaId);

      if (updateError) throw updateError;

      if (contrato.tipo_contrato === 'venda') {
        const { error: receberError } = await supabase
          .from('contas_receber')
          .insert({
            parcela_id: selectedParcelaId,
            cliente_id: contrato.cliente_id,
            valor: parcela.valor,
            valor_original: parcela.valor,
            data_vencimento: dataVencimento.toISOString().split('T')[0],
            data_competencia: dataCompetencia.toISOString().split('T')[0],
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
            data_competencia: dataCompetencia.toISOString().split('T')[0],
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
      const { error: updateError } = await supabase
        .from('parcelas_contrato')
        .update({ status: 'aguardando_conclusao' })
        .eq('id', parcelaId);

      if (updateError) throw updateError;

      await supabase.from('contas_receber').delete().eq('parcela_id', parcelaId);
      await supabase.from('contas_pagar').delete().eq('parcela_id', parcelaId);

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

  const handleReprocessarParcelas = async () => {
    setReprocessing(true);
    try {
      const { data: contrato, error: contratoError } = await supabase
        .from('contratos')
        .select('*')
        .eq('id', id)
        .single();

      if (contratoError) throw contratoError;

      const valorBase = contrato.quantidade * contrato.valor_unitario;
      const desconto = contrato.desconto_tipo === 'percentual'
        ? valorBase * ((contrato.desconto_percentual || 0) / 100)
        : (contrato.desconto_valor || 0);
      const valorBruto = valorBase - desconto;

      const totalImpostosPct = (contrato.irrf_percentual || 0) + (contrato.pis_percentual || 0) +
                               (contrato.cofins_percentual || 0) + (contrato.csll_percentual || 0);
      const valorLiquido = valorBruto * (1 - totalImpostosPct / 100);

      const { data: parcelasData, error: parcelasError } = await supabase
        .from('parcelas_contrato')
        .select('*')
        .eq('contrato_id', id)
        .order('numero_parcela');

      if (parcelasError) throw parcelasError;

      const numeroParcelas = parcelasData?.length || 1;
      const valorPorParcela = Math.round((valorLiquido / numeroParcelas) * 100) / 100;

      for (const parcela of (parcelasData || [])) {
        const { error: updateParcelaError } = await supabase
          .from('parcelas_contrato')
          .update({ valor: valorPorParcela })
          .eq('id', parcela.id);

        if (updateParcelaError) throw updateParcelaError;

        if (contrato.tipo_contrato === 'venda') {
          await supabase
            .from('contas_receber')
            .update({ valor: valorPorParcela, valor_original: valorPorParcela })
            .eq('parcela_id', parcela.id);
        } else {
          await supabase
            .from('contas_pagar')
            .update({ valor: valorPorParcela, valor_original: valorPorParcela })
            .eq('parcela_id', parcela.id);
        }
      }

      const { error: updateContratoError } = await supabase
        .from('contratos')
        .update({
          valor_bruto: valorBruto,
          valor_total: valorLiquido,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateContratoError) throw updateContratoError;

      toast({
        title: "Sucesso",
        description: `${parcelasData?.length || 0} parcelas reprocessadas com os novos valores de impostos!`,
      });

      await fetchContrato();
      await fetchParcelas();
    } catch (error) {
      console.error('Erro ao reprocessar parcelas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reprocessar as parcelas.",
        variant: "destructive",
      });
    } finally {
      setReprocessing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const valorTotal = calcularValorTotal();
      const valorBruto = quantidade * valorUnitario;

      // 1. Update contract
      const { error: contratoError } = await supabase
        .from('contratos')
        .update({
          tipo_contrato: tipoContrato,
          cliente_id: tipoContrato === 'venda' ? clienteId : null,
          fornecedor_id: tipoContrato === 'compra' ? fornecedorId : null,
          data_inicio: dataInicio?.toISOString().split('T')[0],
          data_fim: dataFim?.toISOString().split('T')[0],
          recorrente,
          periodo_recorrencia: recorrente ? periodoRecorrencia : null,
          plano_contas_id: planoContasId,
          centro_custo: centroCustoId,
          vendedor_responsavel: tipoContrato === 'venda' ? vendedorId : null,
          descricao_servico: descricaoServico,
          quantidade,
          valor_unitario: valorUnitario,
          valor_bruto: valorBruto,
          desconto_tipo: descontoTipo,
          desconto_percentual: descontoPercentual,
          desconto_valor: descontoValor,
          irrf_percentual: irrfPercentual,
          pis_percentual: pisPercentual,
          cofins_percentual: cofinsPercentual,
          pis_cofins_percentual: pisPercentual + cofinsPercentual,
          csll_percentual: csllPercentual,
          tipo_pagamento: tipoPagamento,
          conta_bancaria_id: contaBancariaId,
          valor_total: valorTotal,
          link_contrato: linkContrato,
          observacoes_faturamento: observacoesFaturamento || null,
          importancia_cliente_fornecedor: importanciaClienteFornecedor,
          aviso_previo_dias: avisoPrevioDias,
          renovacao_automatica: renovacaoAutomatica,
          ajuste_ipca: ajusteIpca,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (contratoError) throw contratoError;

      // 2. Update parcels and linked financials
      for (const parcela of parcelas) {
        const { error: parcelaError } = await supabase
          .from('parcelas_contrato')
          .update({
            data_vencimento: parcela.data_vencimento,
            valor: parcela.valor,
          })
          .eq('id', parcela.id);

        if (parcelaError) throw parcelaError;

        if (parcela.status !== 'aguardando_conclusao') {
          if (tipoContrato === 'venda') {
            await supabase
              .from('contas_receber')
              .update({
                data_vencimento: parcela.data_vencimento,
                valor: parcela.valor,
                valor_original: parcela.valor,
                centro_custo: centroCustoId,
              })
              .eq('parcela_id', parcela.id);
          } else {
            await supabase
              .from('contas_pagar')
              .update({
                data_vencimento: parcela.data_vencimento,
                valor: parcela.valor,
                valor_original: parcela.valor,
                centro_custo: centroCustoId,
              })
              .eq('parcela_id', parcela.id);
          }
        }
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

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
          <h1 className="text-3xl font-bold text-foreground">Editar Contrato</h1>
          <p className="text-muted-foreground">Atualize todas as informações, valores e parcelas do contrato</p>
        </div>
      </div>

      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Contrato</Label>
            <RadioGroup
              value={tipoContrato}
              onValueChange={(value: string) => setTipoContrato(value as 'venda' | 'compra')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="venda" id="venda" />
                <Label htmlFor="venda">Contrato de Venda</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="compra" id="compra" />
                <Label htmlFor="compra">Contrato de Compra</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Número do Contrato</Label>
              <Input value={numeroContrato} disabled />
            </div>
            <div className="space-y-2">
              <Label>{tipoContrato === 'venda' ? 'Cliente' : 'Fornecedor'}</Label>
              {tipoContrato === 'venda' ? (
                <ClienteSelect value={clienteId} onChange={setClienteId} />
              ) : (
                <FornecedorSelect value={fornecedorId} onChange={setFornecedorId} />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <DateInput value={dataInicio} onChange={setDataInicio} />
            </div>
            <div className="space-y-2">
              <Label>Data de Término</Label>
              <DateInput value={dataFim} onChange={setDataFim} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Recorrente</Label>
              <RadioGroup
                value={recorrente ? 'sim' : 'nao'}
                onValueChange={(value) => setRecorrente(value === 'sim')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="rec-sim" />
                  <Label htmlFor="rec-sim">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="rec-nao" />
                  <Label htmlFor="rec-nao">Não</Label>
                </div>
              </RadioGroup>
            </div>
            {recorrente && (
              <div className="space-y-2">
                <Label>Período de Recorrência</Label>
                <Select value={periodoRecorrencia} onValueChange={setPeriodoRecorrencia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Link do Contrato</Label>
            <Input
              value={linkContrato}
              onChange={(e) => setLinkContrato(e.target.value)}
              placeholder="URL do documento do contrato"
            />
          </div>
        </CardContent>
      </Card>

      {/* Classificação */}
      <Card>
        <CardHeader>
          <CardTitle>Classificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria Financeira</Label>
              <PlanoContasSelect
                value={planoContasId}
                onChange={setPlanoContasId}
                tipo={tipoContrato === 'venda' ? 'entrada' : 'saida'}
              />
            </div>
            <div className="space-y-2">
              <Label>Centro de Custo</Label>
              <CentroCustoSelect
                value={centroCustoId}
                onValueChange={setCentroCustoId}
              />
            </div>
          </div>

          {tipoContrato === 'venda' && (
            <div className="space-y-2">
              <Label>Vendedor Responsável</Label>
              <VendedorSelect value={vendedorId} onChange={setVendedorId} centroCustoId={centroCustoId || undefined} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Importância do {tipoContrato === 'venda' ? 'Cliente' : 'Fornecedor'}</Label>
            <Select value={importanciaClienteFornecedor} onValueChange={(value: any) => setImportanciaClienteFornecedor(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a importância" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="importante">Importante</SelectItem>
                <SelectItem value="mediano">Mediano</SelectItem>
                <SelectItem value="nao_importante">Não Importante</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Valores e Impostos */}
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

          <div className="space-y-2">
            <Label>Tipo de Desconto</Label>
            <RadioGroup
              value={descontoTipo}
              onValueChange={(value: string) => setDescontoTipo(value as 'percentual' | 'valor')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentual" id="desc-perc" />
                <Label htmlFor="desc-perc">Percentual</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="valor" id="desc-valor" />
                <Label htmlFor="desc-valor">Valor</Label>
              </div>
            </RadioGroup>
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

          <div className="space-y-2">
            <Label>Observações de Faturamento</Label>
            <Textarea
              value={observacoesFaturamento}
              onChange={(e) => setObservacoesFaturamento(e.target.value)}
              rows={3}
              placeholder="Observações que serão consideradas no faturamento..."
            />
          </div>

          {/* Condições do Contrato - apenas venda */}
          {tipoContrato === 'venda' && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold text-sm">Condições do Contrato</h3>

              <div className="space-y-2">
                <Label>Aviso Prévio (dias)</Label>
                <Input
                  type="number"
                  min={0}
                  max={90}
                  value={avisoPrevioDias}
                  onChange={(e) => {
                    const val = Math.min(90, Math.max(0, Number(e.target.value)));
                    setAvisoPrevioDias(val);
                  }}
                  placeholder="0 a 90 dias"
                />
                <p className="text-xs text-muted-foreground">Máximo de 90 dias</p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-renovacao-automatica"
                  checked={renovacaoAutomatica}
                  onCheckedChange={(checked) => setRenovacaoAutomatica(checked === true)}
                />
                <Label htmlFor="edit-renovacao-automatica" className="cursor-pointer">
                  Renovação automática a cada 12 meses
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-ajuste-ipca"
                  checked={ajusteIpca}
                  onCheckedChange={(checked) => setAjusteIpca(checked === true)}
                />
                <Label htmlFor="edit-ajuste-ipca" className="cursor-pointer">
                  Ajuste pelo IPCA após 12 meses de contrato
                </Label>
              </div>
            </div>
          )}

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Valor Total Calculado:</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(calcularValorTotal())}</p>
          </div>
        </CardContent>
      </Card>

      {/* Forma de Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle>Forma de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Conta Bancária</Label>
            <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {contasBancarias.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {conta.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Parcelas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Parcelas</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReprocessarParcelas}
            disabled={reprocessing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${reprocessing ? 'animate-spin' : ''}`} />
            {reprocessing ? 'Reprocessando...' : 'Reprocessar Parcelas'}
          </Button>
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

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(`/contratos/${id}`)}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      {/* Go Live Dialog */}
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
