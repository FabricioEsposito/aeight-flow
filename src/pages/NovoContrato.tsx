import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClienteSelect } from '@/components/contratos/ClienteSelect';
import { FornecedorSelect } from '@/components/contratos/FornecedorSelect';
import { PlanoContasSelect } from '@/components/contratos/PlanoContasSelect';
import { ServicosMultiSelect } from '@/components/contratos/ServicosMultiSelect';
import { VendedorSelect } from '@/components/contratos/VendedorSelect';
import CentroCustoSelect from '@/components/centro-custos/CentroCustoSelect';
import { PreviewParcelas } from '@/components/contratos/PreviewParcelas';
import { ParcelamentoCustomizado, ParcelaCustomizada } from '@/components/contratos/ParcelamentoCustomizado';
import { DateInput } from '@/components/ui/date-input';
import { CurrencyInput, PercentageInput } from '@/components/ui/currency-input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { addMonths, differenceInMonths } from 'date-fns';

interface ItemContrato {
  id: string;
  servicoId?: string;
  servicoNome?: string;
  detalhes: string;
  quantidade: number;
  valorUnitario: number;
  total: number;
}

export default function NovoContrato() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Tipo de contrato e venda
  const [tipoContrato, setTipoContrato] = useState<'venda' | 'compra'>('venda');
  const [tipoVenda, setTipoVenda] = useState<'avulsa' | 'recorrente'>('avulsa');

  // Dados básicos
  const [numeroContrato, setNumeroContrato] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [dataInicio, setDataInicio] = useState<Date | null>(new Date());
  const [dataPrimeiraVenda, setDataPrimeiraVenda] = useState<Date | null>(new Date());
  const [diaGeracao, setDiaGeracao] = useState('');

  // Recorrência
  const [periodoRecorrencia, setPeriodoRecorrencia] = useState('mensal');
  const [tipoTermino, setTipoTermino] = useState<'recorrente' | 'periodo'>('recorrente');
  const [dataTermino, setDataTermino] = useState<Date | null>(null);

  // Classificação
  const [planoContasId, setPlanoContasId] = useState('');
  const [vendedorId, setVendedorId] = useState('');
  const [centroCusto, setCentroCusto] = useState('');

  // Itens
  const [itens, setItens] = useState<ItemContrato[]>([]);
  const [itemAtual, setItemAtual] = useState<Partial<ItemContrato>>({
    servicoId: '',
    detalhes: '',
    quantidade: 1,
    valorUnitario: 0,
  });

  // Descontos e impostos
  const [descontoTipo, setDescontoTipo] = useState<'percentual' | 'valor'>('percentual');
  const [descontoPercentual, setDescontoPercentual] = useState(0);
  const [descontoValor, setDescontoValor] = useState(0);
  const [irrfPercentual, setIrrfPercentual] = useState(0);
  const [pisPercentual, setPisPercentual] = useState(0);
  const [cofinsPercentual, setCofinsPercentual] = useState(0);
  const [csllPercentual, setCsllPercentual] = useState(0);

  // Pagamento
  const [tipoPagamento, setTipoPagamento] = useState('');
  const [contaBancariaId, setContaBancariaId] = useState('');
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [diaVencimento, setDiaVencimento] = useState('5');
  
  // Parcelamento (para venda avulsa e compra)
  const [numeroParcelas, setNumeroParcelas] = useState(1);
  const [tipoParcelamento, setTipoParcelamento] = useState<'simples' | 'customizado'>('simples');
  const [parcelasCustomizadas, setParcelasCustomizadas] = useState<any[]>([]);

  // Link do contrato
  const [linkContrato, setLinkContrato] = useState('');

  // Serviços disponíveis
  const [servicos, setServicos] = useState<any[]>([]);

  useEffect(() => {
    fetchContasBancarias();
    fetchServicos();
    if (!id) {
      setNumeroContrato(gerarNumeroContrato());
    } else {
      fetchContrato(id);
    }
  }, [id]);

  useEffect(() => {
    // Atualizar dia de geração quando data de início mudar
    if (dataInicio) {
      setDiaGeracao(dataInicio.getDate().toString());
    }
  }, [dataInicio]);

  const fetchContasBancarias = async () => {
    const { data } = await supabase
      .from('contas_bancarias')
      .select('*')
      .eq('status', 'ativo');
    setContasBancarias(data || []);
  };

  const fetchServicos = async () => {
    const { data } = await supabase
      .from('servicos')
      .select('*')
      .eq('status', 'ativo')
      .order('nome');
    setServicos(data || []);
  };

  const fetchContrato = async (contratoId: string) => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('id', contratoId)
        .single();

      if (error) throw error;

      setTipoContrato(data.tipo_contrato as 'venda' | 'compra');
      setNumeroContrato(data.numero_contrato);
      setClienteId(data.cliente_id || '');
      setFornecedorId(data.fornecedor_id || '');
      setDataInicio(data.data_inicio ? new Date(data.data_inicio) : new Date());
      setDataTermino(data.data_fim ? new Date(data.data_fim) : null);
      setTipoTermino(data.data_fim ? 'periodo' : 'recorrente');
      setPeriodoRecorrencia(data.periodo_recorrencia || 'mensal');
      setPlanoContasId(data.plano_contas_id);
      setCentroCusto(data.centro_custo || '');
      setDescontoTipo((data.desconto_tipo || 'percentual') as 'percentual' | 'valor');
      setDescontoPercentual(data.desconto_percentual || 0);
      setDescontoValor(data.desconto_valor || 0);
      setIrrfPercentual(data.irrf_percentual || 0);
      setPisPercentual(data.pis_percentual || 0);
      setCofinsPercentual(data.cofins_percentual || 0);
      setCsllPercentual(data.csll_percentual || 0);
      setTipoPagamento(data.tipo_pagamento);
      setContaBancariaId(data.conta_bancaria_id);
      setLinkContrato(data.link_contrato || '');
    } catch (error) {
      console.error('Erro ao buscar contrato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o contrato.",
        variant: "destructive",
      });
    }
  };

  const gerarNumeroContrato = () => {
    const prefixo = tipoContrato === 'venda' ? 'CV' : 'CF';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefixo}${timestamp}${random}`;
  };

  const calcularVigenciaTotal = () => {
    if (!dataInicio || tipoTermino === 'recorrente') {
      return 'Indeterminado';
    }
    if (!dataTermino) return '-';

    const meses = differenceInMonths(dataTermino, dataInicio);
    if (meses < 12) {
      return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
    }
    const anos = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;
    if (mesesRestantes === 0) {
      return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
    }
    return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${mesesRestantes} ${mesesRestantes === 1 ? 'mês' : 'meses'}`;
  };

  const adicionarItem = () => {
    if (!itemAtual.detalhes || !itemAtual.quantidade || !itemAtual.valorUnitario) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos do item",
        variant: "destructive",
      });
      return;
    }

    // Buscar nome do serviço se foi selecionado
    let servicoNome = itemAtual.servicoNome;
    if (itemAtual.servicoId && !servicoNome) {
      const servicoSelecionado = servicos.find(s => s.id === itemAtual.servicoId);
      servicoNome = servicoSelecionado ? servicoSelecionado.nome : '';
    }

    const novoItem: ItemContrato = {
      id: Math.random().toString(),
      servicoId: itemAtual.servicoId,
      servicoNome: servicoNome,
      detalhes: itemAtual.detalhes || '',
      quantidade: itemAtual.quantidade || 1,
      valorUnitario: itemAtual.valorUnitario || 0,
      total: (itemAtual.quantidade || 1) * (itemAtual.valorUnitario || 0),
    };

    setItens([...itens, novoItem]);
    setItemAtual({
      servicoId: '',
      servicoNome: '',
      detalhes: '',
      quantidade: 1,
      valorUnitario: 0,
    });
  };

  const removerItem = (id: string) => {
    setItens(itens.filter(item => item.id !== id));
  };

  const calcularSubtotal = () => {
    return itens.reduce((acc, item) => acc + item.total, 0);
  };

  const calcularValorTotal = () => {
    const valorBase = calcularSubtotal();
    let desconto = 0;
    
    if (descontoTipo === 'percentual') {
      desconto = valorBase * (descontoPercentual / 100);
    } else {
      desconto = descontoValor;
    }

    const valorComDesconto = valorBase - desconto;
    const totalImpostos = (irrfPercentual + pisPercentual + cofinsPercentual + csllPercentual) / 100;
    const valorImpostos = valorComDesconto * totalImpostos;
    const valorFinal = valorComDesconto - valorImpostos;

    return valorFinal;
  };

  const calcularDataVencimento = (dataGeracao: Date) => {
    const diaVenc = parseInt(diaVencimento);
    const dataVenc = new Date(dataGeracao);
    dataVenc.setDate(dataVenc.getDate() + diaVenc);
    return dataVenc;
  };

  const calcularParcelas = () => {
    const valorTotal = calcularValorTotal();
    const parcelas: { numero: number; data: Date; valor: number; tipo?: string; descricao?: string }[] = [];

    if (!dataInicio || valorTotal <= 0) return parcelas;

    if (tipoVenda === 'recorrente') {
      // Venda recorrente - gera parcelas baseadas na recorrência
      let dataAtual = dataPrimeiraVenda || dataInicio;
      let numeroParcela = 1;
      const dataLimite = tipoTermino === 'periodo' && dataTermino ? dataTermino : addMonths(dataInicio, 12);

      while (dataAtual <= dataLimite) {
        const dataVenc = calcularDataVencimento(dataAtual);
        parcelas.push({
          numero: numeroParcela,
          data: dataVenc,
          valor: valorTotal,
          tipo: 'normal'
        });

        switch (periodoRecorrencia) {
          case 'mensal':
            dataAtual = addMonths(dataAtual, 1);
            break;
          case 'trimestral':
            dataAtual = addMonths(dataAtual, 3);
            break;
          case 'semestral':
            dataAtual = addMonths(dataAtual, 6);
            break;
          case 'anual':
            dataAtual = addMonths(dataAtual, 12);
            break;
        }
        numeroParcela++;
      }
    } else {
      // Venda avulsa ou compra
      if (tipoParcelamento === 'customizado' && parcelasCustomizadas.length > 0) {
        // Parcelamento customizado com percentuais
        parcelasCustomizadas.forEach((parcelaCustom, index) => {
          const dataGeracao = addMonths(dataInicio, index);
          const dataVenc = parcelaCustom.tipo === 'go-live' ? dataInicio : calcularDataVencimento(dataGeracao);
          const valorParcela = (valorTotal * parcelaCustom.percentual) / 100;
          
          parcelas.push({
            numero: index + 1,
            data: dataVenc,
            valor: valorParcela,
            tipo: parcelaCustom.tipo,
            descricao: parcelaCustom.descricao
          });
        });
      } else {
        // Parcelamento simples - divisão igual
        const valorParcela = valorTotal / numeroParcelas;
        
        for (let i = 0; i < numeroParcelas; i++) {
          const dataGeracao = addMonths(dataInicio, i);
          const dataVenc = calcularDataVencimento(dataGeracao);
          
          parcelas.push({
            numero: i + 1,
            data: dataVenc,
            valor: valorParcela,
            tipo: 'normal'
          });
        }
      }
    }

    return parcelas;
  };

  const handleSalvar = async () => {
    try {
      setLoading(true);

      // Validações
      if (tipoContrato === 'venda' && !clienteId) {
        toast({ title: "Erro", description: "Selecione um cliente", variant: "destructive" });
        return;
      }
      if (tipoContrato === 'compra' && !fornecedorId) {
        toast({ title: "Erro", description: "Selecione um fornecedor", variant: "destructive" });
        return;
      }
      if (!planoContasId || !tipoPagamento || !contaBancariaId) {
        toast({ title: "Erro", description: "Preencha todos os campos obrigatórios", variant: "destructive" });
        return;
      }
      if (itens.length === 0) {
        toast({ title: "Erro", description: "Adicione pelo menos um item ao contrato", variant: "destructive" });
        return;
      }

      // Validar parcelamento customizado
      if (tipoParcelamento === 'customizado' && parcelasCustomizadas.length > 0) {
        const totalPercentual = parcelasCustomizadas.reduce((acc, p) => acc + p.percentual, 0);
        if (Math.abs(totalPercentual - 100) > 0.01) {
          toast({ 
            title: "Erro", 
            description: "O total dos percentuais das parcelas deve ser 100%", 
            variant: "destructive" 
          });
          return;
        }
      }

      // Gerar novo número de contrato sempre (evitar duplicação em caso de erro)
      const novoNumeroContrato = gerarNumeroContrato();
      setNumeroContrato(novoNumeroContrato);

      const valorTotal = calcularValorTotal();
      const valorBruto = calcularSubtotal();
      const contratoData: any = {
        numero_contrato: novoNumeroContrato,
        tipo_contrato: tipoContrato,
        cliente_id: tipoContrato === 'venda' ? clienteId : null,
        fornecedor_id: tipoContrato === 'compra' ? fornecedorId : null,
        data_inicio: dataInicio?.toISOString().split('T')[0],
        data_fim: tipoTermino === 'periodo' && dataTermino ? dataTermino.toISOString().split('T')[0] : null,
        recorrente: tipoVenda === 'recorrente',
        periodo_recorrencia: tipoVenda === 'recorrente' ? periodoRecorrencia : null,
        plano_contas_id: planoContasId,
        centro_custo: centroCusto,
        vendedor_responsavel: tipoContrato === 'venda' ? vendedorId : null,
        servicos: itens.map(item => item.servicoId).filter(Boolean),
        descricao_servico: itens.map(item => `${item.detalhes} (${item.quantidade}x R$ ${item.valorUnitario})`).join('\n'),
        quantidade: itens.reduce((acc, item) => acc + item.quantidade, 0),
        valor_unitario: calcularSubtotal() / itens.reduce((acc, item) => acc + item.quantidade, 0),
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
        status: 'ativo'
      };

      let contratoId = id;

      if (id) {
        const { error } = await supabase
          .from('contratos')
          .update(contratoData)
          .eq('id', id);

        if (error) throw error;
        await supabase.from('parcelas_contrato').delete().eq('contrato_id', id);
      } else {
        const { data, error } = await supabase
          .from('contratos')
          .insert([contratoData])
          .select()
          .single();

        if (error) throw error;
        contratoId = data.id;
      }

      // Criar parcelas
      const parcelas = calcularParcelas();
      const parcelasData = parcelas.map(p => ({
        contrato_id: contratoId,
        numero_parcela: p.numero,
        valor: p.valor,
        data_vencimento: p.data.toISOString().split('T')[0],
        status: p.tipo === 'go-live' ? 'aguardando_conclusao' : 'pendente',
        tipo: tipoContrato === 'venda' ? 'receber' : 'pagar',
        conta_bancaria_id: contaBancariaId
      }));

      const { data: parcelasInseridas, error: parcelasError } = await supabase
        .from('parcelas_contrato')
        .insert(parcelasData)
        .select();

      if (parcelasError) throw parcelasError;

      // Integrar com contas a receber/pagar (exceto parcelas go-live)
      const parcelasNormais = parcelasInseridas.filter(p => p.status !== 'aguardando_conclusao');
      
      if (tipoContrato === 'venda' && parcelasNormais.length > 0) {
        const contasReceberData = parcelasNormais.map(parcela => ({
          parcela_id: parcela.id,
          cliente_id: clienteId,
          valor: parcela.valor,
          valor_original: parcela.valor,
          data_vencimento: parcela.data_vencimento,
          data_competencia: dataInicio?.toISOString().split('T')[0],
          plano_conta_id: planoContasId,
          conta_bancaria_id: contaBancariaId,
          centro_custo: centroCusto,
          status: 'pendente',
          descricao: `Parcela ${parcela.numero_parcela} - Contrato ${numeroContrato}`,
          juros: 0,
          multa: 0,
          desconto: 0
        }));

        const { error: receberError } = await supabase
          .from('contas_receber')
          .insert(contasReceberData);

        if (receberError) throw receberError;
      } else if (parcelasNormais.length > 0) {
        const contasPagarData = parcelasNormais.map(parcela => ({
          parcela_id: parcela.id,
          fornecedor_id: fornecedorId,
          valor: parcela.valor,
          valor_original: parcela.valor,
          data_vencimento: parcela.data_vencimento,
          data_competencia: dataInicio?.toISOString().split('T')[0],
          plano_conta_id: planoContasId,
          conta_bancaria_id: contaBancariaId,
          centro_custo: centroCusto,
          status: 'pendente',
          descricao: `Parcela ${parcela.numero_parcela} - Contrato ${numeroContrato}`,
          juros: 0,
          multa: 0,
          desconto: 0
        }));

        const { error: pagarError } = await supabase
          .from('contas_pagar')
          .insert(contasPagarData);

        if (pagarError) throw pagarError;
      }

      toast({
        title: "Sucesso",
        description: id ? "Contrato atualizado com sucesso!" : "Contrato criado com sucesso!",
      });

      navigate('/contratos');
    } catch (error) {
      console.error('Erro ao salvar contrato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o contrato.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/contratos')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {id ? 'Editar Contrato' : 'Novo Contrato'}
          </h1>
          <p className="text-muted-foreground">
            {id ? 'Atualize as informações do contrato' : 'Preencha os dados do novo contrato'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Informações */}
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tipo de Contrato */}
              <div className="space-y-2">
                <Label>Tipo de Contrato *</Label>
                <RadioGroup 
                  value={tipoContrato} 
                  onValueChange={(value: string) => {
                    setTipoContrato(value as 'venda' | 'compra');
                    setNumeroContrato(gerarNumeroContrato());
                  }}
                  disabled={!!id}
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

              {/* Tipo de Venda (apenas para contratos de venda) */}
              {tipoContrato === 'venda' && (
                <div className="space-y-2">
                  <Label>Tipo da Venda *</Label>
                  <RadioGroup 
                    value={tipoVenda} 
                    onValueChange={(value: string) => setTipoVenda(value as any)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="avulsa" id="avulsa" />
                      <Label htmlFor="avulsa">Venda avulsa</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="recorrente" id="recorrente" />
                      <Label htmlFor="recorrente">Venda recorrente (contrato)</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número do contrato *</Label>
                  <Input value={numeroContrato} disabled />
                </div>

                <div className="space-y-2">
                  <Label>{tipoContrato === 'venda' ? 'Cliente *' : 'Fornecedor *'}</Label>
                  {tipoContrato === 'venda' ? (
                    <ClienteSelect value={clienteId} onChange={setClienteId} />
                  ) : (
                    <FornecedorSelect value={fornecedorId} onChange={setFornecedorId} />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de início *</Label>
                  <DateInput value={dataInicio} onChange={setDataInicio} />
                </div>

                {tipoVenda === 'recorrente' && (
                  <div className="space-y-2">
                    <Label>Dia da geração das vendas *</Label>
                    <Select value={diaGeracao} onValueChange={setDiaGeracao}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(dia => (
                          <SelectItem key={dia} value={dia.toString()}>
                            {dia}º dia do mês
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {tipoVenda === 'recorrente' && (
                <>
                  <div className="space-y-2">
                    <Label>Data da primeira venda *</Label>
                    <DateInput value={dataPrimeiraVenda} onChange={setDataPrimeiraVenda} />
                  </div>

                  {/* Configurações de recorrência */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-4">Configurações de recorrência</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Repetir venda a cada *</Label>
                        <Select value={periodoRecorrencia} onValueChange={setPeriodoRecorrencia}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mensal">Mês/meses</SelectItem>
                            <SelectItem value="trimestral">Trimestre</SelectItem>
                            <SelectItem value="semestral">Semestre</SelectItem>
                            <SelectItem value="anual">Ano</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Término da recorrência *</Label>
                        <Select value={tipoTermino} onValueChange={(value: string) => setTipoTermino(value as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="recorrente">Recorrente</SelectItem>
                            <SelectItem value="periodo">Em um período específico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {tipoTermino === 'periodo' && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label>Data de término *</Label>
                          <DateInput value={dataTermino} onChange={setDataTermino} />
                        </div>
                        <div className="space-y-2">
                          <Label>Vigência total</Label>
                          <Input value={calcularVigenciaTotal()} disabled />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
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
                  <Label>Categoria financeira *</Label>
                  <PlanoContasSelect 
                    value={planoContasId} 
                    onChange={setPlanoContasId}
                    tipo={tipoContrato === 'venda' ? 'entrada' : 'saida'}
                  />
                </div>

                {tipoContrato === 'venda' && (
                  <div className="space-y-2">
                    <Label>Vendedor responsável</Label>
                    <VendedorSelect value={vendedorId} onChange={setVendedorId} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Centro de custo */}
          <Card>
            <CardHeader>
              <CardTitle>Centro de custo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Centro de custo</Label>
                <CentroCustoSelect 
                  value={centroCusto}
                  onValueChange={setCentroCusto}
                />
              </div>
            </CardContent>
          </Card>

          {/* Itens */}
          <Card>
            <CardHeader>
              <CardTitle>Itens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de itens adicionados */}
              {itens.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left text-sm font-medium">Produtos/Serviços</th>
                        <th className="p-2 text-left text-sm font-medium">Detalhes do item</th>
                        <th className="p-2 text-left text-sm font-medium">Quantidade</th>
                        <th className="p-2 text-left text-sm font-medium">Valor unitário</th>
                        <th className="p-2 text-left text-sm font-medium">Total</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="p-2 text-sm">{item.servicoNome || '-'}</td>
                          <td className="p-2 text-sm">{item.detalhes}</td>
                          <td className="p-2 text-sm">{item.quantidade}</td>
                          <td className="p-2 text-sm">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorUnitario)}
                          </td>
                          <td className="p-2 text-sm font-medium">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                          </td>
                          <td className="p-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removerItem(item.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Formulário para adicionar item */}
              <div className="space-y-4 border-t pt-4">
                <Label>Selecione ou crie um novo item *</Label>
                
                {tipoContrato === 'venda' && (
                  <div className="space-y-2">
                    <Label>Produtos/Serviços *</Label>
                    <Select 
                      value={itemAtual.servicoId} 
                      onValueChange={(value) => {
                        const servicoSelecionado = servicos.find(s => s.id === value);
                        setItemAtual({ 
                          ...itemAtual, 
                          servicoId: value,
                          servicoNome: servicoSelecionado ? servicoSelecionado.nome : ''
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {servicos.map((servico) => (
                          <SelectItem key={servico.id} value={servico.id}>
                            {servico.codigo} - {servico.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Detalhes do item *</Label>
                    <Textarea 
                      value={itemAtual.detalhes}
                      onChange={(e) => setItemAtual({ ...itemAtual, detalhes: e.target.value })}
                      placeholder="Descreva os detalhes do item..."
                      rows={2}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade *</Label>
                    <Input 
                      type="number"
                      min="1"
                      value={itemAtual.quantidade}
                      onChange={(e) => setItemAtual({ ...itemAtual, quantidade: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Valor unitário *</Label>
                    <CurrencyInput 
                      value={itemAtual.valorUnitario || 0}
                      onChange={(value) => setItemAtual({ ...itemAtual, valorUnitario: value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Total</Label>
                    <Input 
                      value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        (itemAtual.quantidade || 0) * (itemAtual.valorUnitario || 0)
                      )}
                      disabled
                    />
                  </div>
                </div>

                <Button onClick={adicionarItem} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Descontos e Impostos */}
          <Card>
            <CardHeader>
              <CardTitle>Valor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Desconto</Label>
                <RadioGroup 
                  value={descontoTipo} 
                  onValueChange={(value) => setDescontoTipo(value as 'percentual' | 'valor')}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentual" id="desc-percent" />
                    <Label htmlFor="desc-percent">Percentual (%)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="valor" id="desc-valor" />
                    <Label htmlFor="desc-valor">Valor (R$)</Label>
                  </div>
                </RadioGroup>
              </div>

              {descontoTipo === 'percentual' ? (
                <div className="space-y-2">
                  <Label>Desconto (%)</Label>
                  <PercentageInput 
                    value={descontoPercentual}
                    onChange={setDescontoPercentual}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Desconto (R$)</Label>
                  <CurrencyInput 
                    value={descontoValor}
                    onChange={setDescontoValor}
                  />
                </div>
              )}

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

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between items-center">
                  <span>Subtotal:</span>
                  <span>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(calcularSubtotal())}
                  </span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Valor Total do Contrato:</span>
                  <span>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(calcularValorTotal())}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle>Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Pagamento *</Label>
                <Select value={tipoPagamento} onValueChange={setTipoPagamento}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Parcelamento (apenas para venda avulsa e compra) */}
              {(tipoVenda === 'avulsa' || tipoContrato === 'compra') && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Parcelamento *</Label>
                    <RadioGroup 
                      value={tipoParcelamento} 
                      onValueChange={(value: string) => {
                        setTipoParcelamento(value as 'simples' | 'customizado');
                        if (value === 'customizado' && parcelasCustomizadas.length === 0) {
                          // Inicializar com uma parcela de 100%
                          setParcelasCustomizadas([{
                            id: Math.random().toString(),
                            percentual: 100,
                            tipo: 'normal',
                            descricao: ''
                          }]);
                        }
                      }}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="simples" id="simples" />
                        <Label htmlFor="simples">Divisão igual</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="customizado" id="customizado" />
                        <Label htmlFor="customizado">Percentuais customizados</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {tipoParcelamento === 'simples' ? (
                    <div className="space-y-2">
                      <Label>Número de Parcelas *</Label>
                      <Select 
                        value={numeroParcelas.toString()} 
                        onValueChange={(value) => setNumeroParcelas(Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {num}x de {new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              }).format(calcularValorTotal() / num)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <ParcelamentoCustomizado
                      parcelas={parcelasCustomizadas}
                      onChange={setParcelasCustomizadas}
                      valorTotal={calcularValorTotal()}
                    />
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Vencer sempre no *</Label>
                <Select value={diaVencimento} onValueChange={setDiaVencimento}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(dia => (
                      <SelectItem key={dia} value={dia.toString()}>
                        {dia}º dia após geração
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Conta Bancária *</Label>
                <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contasBancarias.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.banco} - {conta.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Link do Contrato</Label>
                <Input 
                  type="url"
                  value={linkContrato}
                  onChange={(e) => setLinkContrato(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button onClick={handleSalvar} disabled={loading} className="flex-1">
              {loading ? 'Salvando...' : id ? 'Atualizar Contrato' : 'Salvar Contrato'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/contratos')}>
              Cancelar
            </Button>
          </div>
        </div>

        {/* Preview de Parcelas */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <PreviewParcelas parcelas={calcularParcelas()} />
          </div>
        </div>
      </div>
    </div>
  );
}
