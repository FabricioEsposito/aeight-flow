import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, MoreVertical, X, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

  useEffect(() => {
    if (id) {
      fetchContrato();
      fetchContasBancarias();
    }
  }, [id]);

  // When changing centro de custo, force reselect vendor to avoid homonyms across cost centers
  useEffect(() => {
    const prev = prevCentroCustoRef.current;
    if (prev && prev !== centroCustoId && vendedorId) {
      setVendedorId('');
    }
    prevCentroCustoRef.current = centroCustoId;
  }, [centroCustoId, vendedorId]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const valorTotal = calcularValorTotal();
      const valorBruto = quantidade * valorUnitario;

      const { error } = await supabase
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

      if (error) throw error;

      // Atualizar centro de custos nas parcelas de contas a receber/pagar
      // Primeiro, buscar as parcelas do contrato
      const { data: parcelas, error: parcelasError } = await supabase
        .from('parcelas_contrato')
        .select('id')
        .eq('contrato_id', id);

      if (parcelasError) throw parcelasError;

      if (parcelas && parcelas.length > 0) {
        const parcelaIds = parcelas.map(p => p.id);

        // Atualizar contas_receber se for venda
        if (tipoContrato === 'venda') {
          const { error: receberError } = await supabase
            .from('contas_receber')
            .update({ centro_custo: centroCustoId })
            .in('parcela_id', parcelaIds);

          if (receberError) throw receberError;
        } 
        // Atualizar contas_pagar se for compra
        else {
          const { error: pagarError } = await supabase
            .from('contas_pagar')
            .update({ centro_custo: centroCustoId })
            .in('parcela_id', parcelaIds);

          if (pagarError) throw pagarError;
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
          <p className="text-muted-foreground">Atualize todas as informações do contrato</p>
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

          {/* Campos adicionais para contratos de venda */}
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
            <p className="text-2xl font-bold text-primary">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calcularValorTotal())}
            </p>
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

      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              Ações
              <MoreVertical className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-background z-50">
            <DropdownMenuItem onClick={() => navigate(`/contratos/${id}`)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/contratos/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar valores e parcelas
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}