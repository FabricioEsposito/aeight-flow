import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, DollarSign, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function VisualizarContrato() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contrato, setContrato] = useState<any>(null);
  const [parcelas, setParcelas] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchContrato();
      fetchParcelas();
    }
  }, [id]);

  const fetchContrato = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select(`
          *,
          clientes:cliente_id (razao_social, cnpj_cpf, email, telefone),
          fornecedores:fornecedor_id (razao_social, cnpj_cpf, email, telefone),
          plano_contas:plano_contas_id (codigo, descricao),
          contas_bancarias:conta_bancaria_id (banco, descricao)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setContrato(data);
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
        .select('*')
        .eq('contrato_id', id)
        .order('numero_parcela', { ascending: true });

      if (error) throw error;
      setParcelas(data || []);
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCnpjCpf = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
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

  if (!contrato) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Contrato não encontrado.</p>
      </div>
    );
  }

  const entidade = contrato.tipo_contrato === 'venda' ? contrato.clientes : contrato.fornecedores;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/contratos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Detalhes do Contrato</h1>
            <p className="text-muted-foreground">{contrato.numero_contrato}</p>
          </div>
        </div>
        <Badge variant={contrato.status === 'ativo' ? 'default' : 'secondary'} className="text-lg px-4 py-2">
          {contrato.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informações do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tipo de Contrato</label>
              <p className="text-lg">
                <Badge variant={contrato.tipo_contrato === 'venda' ? 'default' : 'secondary'}>
                  {contrato.tipo_contrato === 'venda' ? 'Contrato de Venda (CV)' : 'Contrato de Compra (CF)'}
                </Badge>
              </p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Período</label>
              <p className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(contrato.data_inicio)} 
                {contrato.data_fim && ` até ${formatDate(contrato.data_fim)}`}
              </p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Recorrência</label>
              <p className="text-lg">
                {contrato.recorrente ? `Sim (${contrato.periodo_recorrencia})` : 'Não'}
              </p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tipo de Pagamento</label>
              <p className="text-lg capitalize">{contrato.tipo_pagamento}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {contrato.tipo_contrato === 'venda' ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
              {contrato.tipo_contrato === 'venda' ? 'Cliente' : 'Fornecedor'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Razão Social</label>
              <p className="text-lg font-medium">{entidade?.razao_social}</p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">CNPJ/CPF</label>
              <p className="text-lg">{formatCnpjCpf(entidade?.cnpj_cpf || '')}</p>
            </div>
            {entidade?.email && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-lg">{entidade.email}</p>
                </div>
              </>
            )}
            {entidade?.telefone && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                  <p className="text-lg">{entidade.telefone}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Valores e Impostos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Quantidade</label>
              <p className="text-lg">{contrato.quantidade}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Valor Unitário</label>
              <p className="text-lg">{formatCurrency(contrato.valor_unitario)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Desconto</label>
              <p className="text-lg">
                {contrato.desconto_tipo === 'percentual' 
                  ? `${contrato.desconto_percentual}%` 
                  : formatCurrency(contrato.desconto_valor)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Valor Total</label>
              <p className="text-2xl font-bold text-primary">{formatCurrency(contrato.valor_total)}</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">IRRF</label>
              <p className="text-lg">{contrato.irrf_percentual}%</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">PIS/COFINS</label>
              <p className="text-lg">{contrato.pis_cofins_percentual}%</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">CSLL</label>
              <p className="text-lg">{contrato.csll_percentual}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {contrato.descricao_servico && (
        <Card>
          <CardHeader>
            <CardTitle>Descrição do Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{contrato.descricao_servico}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Parcelas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parcela</TableHead>
                <TableHead>Data Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma parcela encontrada
                  </TableCell>
                </TableRow>
              ) : (
                parcelas.map((parcela) => (
                  <TableRow key={parcela.id}>
                    <TableCell>{parcela.numero_parcela}</TableCell>
                    <TableCell>{formatDate(parcela.data_vencimento)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(parcela.valor)}</TableCell>
                    <TableCell>
                      <Badge variant={parcela.status === 'pago' ? 'default' : 'secondary'}>
                        {parcela.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => navigate('/contratos')}>
          Voltar
        </Button>
        <Button onClick={() => navigate(`/contratos/${id}/edit`)}>
          Editar Contrato
        </Button>
      </div>
    </div>
  );
}
