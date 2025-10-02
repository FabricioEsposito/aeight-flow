import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClienteSelect } from '@/components/contratos/ClienteSelect';
import { FornecedorSelect } from '@/components/contratos/FornecedorSelect';
import { PlanoContasSelect } from '@/components/contratos/PlanoContasSelect';
import { ServicosMultiSelect } from '@/components/contratos/ServicosMultiSelect';
import { PreviewParcelas } from '@/components/contratos/PreviewParcelas';
import { DateInput } from '@/components/ui/date-input';
import { CurrencyInput, PercentageInput } from '@/components/ui/currency-input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { addMonths, addDays } from 'date-fns';

export default function NovoContrato() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Tipo de contrato
  const [tipoContrato, setTipoContrato] = useState<'venda' | 'compra'>('venda');

  // Dados básicos
  const [clienteId, setClienteId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [dataInicio, setDataInicio] = useState<Date | null>(new Date());
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [recorrente, setRecorrente] = useState(false);
  const [periodoRecorrencia, setPeriodoRecorrencia] = useState('mensal');
  const [planoContasId, setPlanoContasId] = useState('');

  // Serviços
  const [servicosIds, setServicosIds] = useState<string[]>([]);
  const [descricaoServico, setDescricaoServico] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [valorUnitario, setValorUnitario] = useState(0);

  // Descontos e impostos
  const [descontoTipo, setDescontoTipo] = useState<'percentual' | 'valor'>('percentual');
  const [descontoPercentual, setDescontoPercentual] = useState(0);
  const [descontoValor, setDescontoValor] = useState(0);
  const [irrfPercentual, setIrrfPercentual] = useState(0);
  const [pisCofinsPercentual, setPisCofinsPercentual] = useState(0);
  const [csllPercentual, setCsllPercentual] = useState(0);

  // Pagamento
  const [tipoPagamento, setTipoPagamento] = useState('');
  const [contaBancariaId, setContaBancariaId] = useState('');

  // Contas bancárias
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);

  useEffect(() => {
    fetchContasBancarias();
    if (id) {
      fetchContrato(id);
    }
  }, [id]);

  const fetchContasBancarias = async () => {
    const { data } = await supabase
      .from('contas_bancarias')
      .select('*')
      .eq('status', 'ativo');
    setContasBancarias(data || []);
  };

  const fetchContrato = async (contratoId: string) => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('id', contratoId)
        .single();

      if (error) throw error;

      // Preencher formulário com dados existentes
      setTipoContrato(data.tipo_contrato as 'venda' | 'compra');
      setClienteId(data.cliente_id || '');
      setFornecedorId(data.fornecedor_id || '');
      setDataInicio(data.data_inicio ? new Date(data.data_inicio) : new Date());
      setDataFim(data.data_fim ? new Date(data.data_fim) : null);
      setRecorrente(data.recorrente);
      setPeriodoRecorrencia(data.periodo_recorrencia || 'mensal');
      setPlanoContasId(data.plano_contas_id);
      const servicosArray = Array.isArray(data.servicos) ? (data.servicos as string[]) : [];
      setServicosIds(servicosArray);
      setDescricaoServico(data.descricao_servico || '');
      setQuantidade(data.quantidade);
      setValorUnitario(data.valor_unitario);
      setDescontoTipo((data.desconto_tipo || 'percentual') as 'percentual' | 'valor');
      setDescontoPercentual(data.desconto_percentual || 0);
      setDescontoValor(data.desconto_valor || 0);
      setIrrfPercentual(data.irrf_percentual || 0);
      setPisCofinsPercentual(data.pis_cofins_percentual || 0);
      setCsllPercentual(data.csll_percentual || 0);
      setTipoPagamento(data.tipo_pagamento);
      setContaBancariaId(data.conta_bancaria_id);
    } catch (error) {
      console.error('Erro ao buscar contrato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o contrato.",
        variant: "destructive",
      });
    }
  };

  const calcularValorTotal = () => {
    const valorBase = quantidade * valorUnitario;
    let desconto = 0;
    
    if (descontoTipo === 'percentual') {
      desconto = valorBase * (descontoPercentual / 100);
    } else {
      desconto = descontoValor;
    }

    const valorComDesconto = valorBase - desconto;
    const totalImpostos = (irrfPercentual + pisCofinsPercentual + csllPercentual) / 100;
    const valorImpostos = valorComDesconto * totalImpostos;
    const valorFinal = valorComDesconto - valorImpostos;

    return valorFinal;
  };

  const calcularParcelas = () => {
    const valorTotal = calcularValorTotal();
    const parcelas: { numero: number; data: Date; valor: number }[] = [];

    if (!dataInicio) return parcelas;

    if (recorrente) {
      let dataAtual = dataInicio;
      let numeroParcela = 1;
      const dataLimite = dataFim || addMonths(dataInicio, 12);

      while (dataAtual <= dataLimite) {
        parcelas.push({
          numero: numeroParcela,
          data: dataAtual,
          valor: valorTotal
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
      parcelas.push({
        numero: 1,
        data: dataInicio,
        valor: valorTotal
      });
    }

    return parcelas;
  };

  const gerarNumeroContrato = () => {
    const prefixo = tipoContrato === 'venda' ? 'CV' : 'CF';
    const timestamp = new Date().getTime().toString().slice(-6);
    return `${prefixo}${timestamp}`;
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

      const valorTotal = calcularValorTotal();
      const contratoData = {
        numero_contrato: id ? undefined : gerarNumeroContrato(),
        tipo_contrato: tipoContrato,
        cliente_id: tipoContrato === 'venda' ? clienteId : null,
        fornecedor_id: tipoContrato === 'compra' ? fornecedorId : null,
        data_inicio: dataInicio?.toISOString().split('T')[0],
        data_fim: dataFim?.toISOString().split('T')[0],
        recorrente,
        periodo_recorrencia: recorrente ? periodoRecorrencia : null,
        plano_contas_id: planoContasId,
        servicos: tipoContrato === 'venda' ? servicosIds : null,
        descricao_servico: descricaoServico,
        quantidade,
        valor_unitario: valorUnitario,
        desconto_tipo: descontoTipo,
        desconto_percentual: descontoPercentual,
        desconto_valor: descontoValor,
        irrf_percentual: irrfPercentual,
        pis_cofins_percentual: pisCofinsPercentual,
        csll_percentual: csllPercentual,
        tipo_pagamento: tipoPagamento,
        conta_bancaria_id: contaBancariaId,
        valor_total: valorTotal,
        status: 'ativo'
      };

      let contratoId = id;

      if (id) {
        // Atualizar contrato existente
        const { error } = await supabase
          .from('contratos')
          .update(contratoData)
          .eq('id', id);

        if (error) throw error;

        // Deletar parcelas antigas
        await supabase.from('parcelas_contrato').delete().eq('contrato_id', id);
      } else {
        // Criar novo contrato
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
        status: 'pendente',
        tipo: tipoContrato === 'venda' ? 'receber' : 'pagar'
      }));

      const { data: parcelasInseridas, error: parcelasError } = await supabase
        .from('parcelas_contrato')
        .insert(parcelasData)
        .select();

      if (parcelasError) throw parcelasError;

      // Integrar com contas a receber/pagar
      if (tipoContrato === 'venda') {
        const contasReceberData = parcelasInseridas.map(parcela => ({
          parcela_id: parcela.id,
          cliente_id: clienteId,
          valor: parcela.valor,
          data_vencimento: parcela.data_vencimento,
          data_competencia: dataInicio?.toISOString().split('T')[0],
          plano_conta_id: planoContasId,
          status: 'pendente',
          descricao: `Parcela ${parcela.numero_parcela} - Contrato ${contratoData.numero_contrato || ''}`
        }));

        const { error: receberError } = await supabase
          .from('contas_receber')
          .insert(contasReceberData);

        if (receberError) throw receberError;
      } else {
        const contasPagarData = parcelasInseridas.map(parcela => ({
          parcela_id: parcela.id,
          fornecedor_id: fornecedorId,
          valor: parcela.valor,
          data_vencimento: parcela.data_vencimento,
          data_competencia: dataInicio?.toISOString().split('T')[0],
          plano_conta_id: planoContasId,
          status: 'pendente',
          descricao: `Parcela ${parcela.numero_parcela} - Contrato ${contratoData.numero_contrato || ''}`
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
          {/* Tipo de Contrato */}
          <Card>
            <CardHeader>
              <CardTitle>Tipo de Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={tipoContrato} 
                onValueChange={(value: string) => setTipoContrato(value as 'venda' | 'compra')}
                disabled={!!id}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="venda" id="venda" />
                  <Label htmlFor="venda">Contrato de Venda (CV)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="compra" id="compra" />
                  <Label htmlFor="compra">Contrato de Compra (CF)</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Dados Básicos */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Contrato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tipoContrato === 'venda' ? (
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <ClienteSelect value={clienteId} onChange={setClienteId} />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Fornecedor *</Label>
                  <FornecedorSelect value={fornecedorId} onChange={setFornecedorId} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início *</Label>
                  <DateInput value={dataInicio} onChange={setDataInicio} />
                </div>
                
                {!recorrente && (
                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <DateInput value={dataFim} onChange={setDataFim} />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="recorrente" 
                  checked={recorrente} 
                  onCheckedChange={(checked) => setRecorrente(checked as boolean)}
                />
                <Label htmlFor="recorrente">Contrato Recorrente</Label>
              </div>

              {recorrente && (
                <div className="space-y-2">
                  <Label>Período de Recorrência</Label>
                  <Select value={periodoRecorrencia} onValueChange={setPeriodoRecorrencia}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="semestral">Semestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Plano de Contas *</Label>
                <PlanoContasSelect 
                  value={planoContasId} 
                  onChange={setPlanoContasId}
                  tipo={tipoContrato === 'venda' ? 'entrada' : 'saida'}
                />
              </div>
            </CardContent>
          </Card>

          {/* Serviços */}
          <Card>
            <CardHeader>
              <CardTitle>Serviços/Produtos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tipoContrato === 'venda' && (
                <div className="space-y-2">
                  <Label>Serviços</Label>
                  <ServicosMultiSelect value={servicosIds} onChange={setServicosIds} />
                </div>
              )}

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea 
                  value={descricaoServico}
                  onChange={(e) => setDescricaoServico(e.target.value)}
                  placeholder="Descreva os serviços/produtos contratados..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade *</Label>
                  <Input 
                    type="number"
                    min="1"
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor Unitário (R$) *</Label>
                  <CurrencyInput 
                    value={valorUnitario}
                    onChange={setValorUnitario}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Descontos e Impostos */}
          <Card>
            <CardHeader>
              <CardTitle>Descontos e Impostos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Desconto</Label>
                <RadioGroup 
                  value={descontoTipo} 
                  onValueChange={(value) => setDescontoTipo(value as 'percentual' | 'valor')}
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

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>IRRF (%)</Label>
                  <PercentageInput value={irrfPercentual} onChange={setIrrfPercentual} />
                </div>

                <div className="space-y-2">
                  <Label>PIS/COFINS (%)</Label>
                  <PercentageInput value={pisCofinsPercentual} onChange={setPisCofinsPercentual} />
                </div>

                <div className="space-y-2">
                  <Label>CSLL (%)</Label>
                  <PercentageInput value={csllPercentual} onChange={setCsllPercentual} />
                </div>
              </div>

              <div className="pt-4 border-t">
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
          <PreviewParcelas parcelas={calcularParcelas()} />
        </div>
      </div>
    </div>
  );
}
