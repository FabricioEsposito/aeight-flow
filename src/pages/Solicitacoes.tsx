import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, X, Clock, FileText, CheckSquare, Building2, User, CreditCard, Receipt, Calendar, DollarSign, Banknote } from 'lucide-react';
import { CompanyTag } from '@/components/centro-custos/CompanyBadge';

interface LancamentoDetalhes {
  id: string;
  descricao: string;
  data_competencia: string;
  status: string | null;
  observacoes: string | null;
  numero_nf?: string | null;
  cliente?: {
    razao_social: string;
    nome_fantasia: string | null;
    cnpj_cpf: string;
  };
  fornecedor?: {
    razao_social: string;
    nome_fantasia: string | null;
    cnpj_cpf: string;
  };
  plano_conta?: {
    codigo: string;
    descricao: string;
  };
  conta_bancaria?: {
    descricao: string;
    banco: string;
  };
  centro_custo_info?: {
    codigo: string;
    descricao: string;
  };
}

interface SolicitacaoAjuste {
  id: string;
  tipo_lancamento: string;
  lancamento_id: string;
  data_vencimento_atual: string;
  data_vencimento_solicitada: string;
  solicitante_id: string;
  aprovador_id: string | null;
  motivo_solicitacao: string;
  motivo_rejeicao: string | null;
  status: string;
  created_at: string;
  data_resposta: string | null;
  valor_original: number;
  juros_atual: number;
  juros_solicitado: number;
  multa_atual: number;
  multa_solicitada: number;
  desconto_atual: number;
  desconto_solicitado: number;
  plano_conta_id: string | null;
  centro_custo: string | null;
  conta_bancaria_id: string | null;
  solicitante: {
    nome: string;
    email: string;
  };
  aprovador?: {
    nome: string;
    email: string;
  };
  lancamento?: LancamentoDetalhes;
}

export default function Solicitacoes() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAjuste[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    solicitacao: SolicitacaoAjuste | null;
    action: 'aprovar' | 'rejeitar' | null;
  }>({
    open: false,
    solicitacao: null,
    action: null,
  });
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDialog, setBatchDialog] = useState<{
    open: boolean;
    action: 'aprovar' | 'rejeitar' | null;
  }>({ open: false, action: null });
  const [batchMotivoRejeicao, setBatchMotivoRejeicao] = useState('');

  useEffect(() => {
    loadSolicitacoes();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('solicitacoes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitacoes_ajuste_financeiro',
        },
        () => {
          loadSolicitacoes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

  const loadSolicitacoes = async () => {
    try {
      let query = supabase
        .from('solicitacoes_ajuste_financeiro')
        .select('*')
        .order('created_at', { ascending: false });

      // Se não for admin, mostrar apenas suas solicitações
      if (!isAdmin) {
        query = query.eq('solicitante_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Buscar perfis dos solicitantes, aprovadores e detalhes dos lançamentos
      const solicitacoesComPerfis = await Promise.all(
        (data || []).map(async (sol) => {
          const { data: solicitanteData } = await supabase
            .from('profiles')
            .select('nome, email')
            .eq('id', sol.solicitante_id)
            .maybeSingle();
          
          let aprovadorData = null;
          if (sol.aprovador_id) {
            const { data: aprovador } = await supabase
              .from('profiles')
              .select('nome, email')
              .eq('id', sol.aprovador_id)
              .maybeSingle();
            aprovadorData = aprovador;
          }
          
          // Buscar detalhes do lançamento
          let lancamentoDetalhes: LancamentoDetalhes | undefined;
          if (sol.tipo_lancamento === 'receber') {
            const { data: lancamento } = await supabase
              .from('contas_receber')
              .select(`
                id,
                descricao,
                data_competencia,
                status,
                observacoes,
                numero_nf,
                cliente:clientes (
                  razao_social,
                  nome_fantasia,
                  cnpj_cpf
                ),
                plano_conta:plano_contas (
                  codigo,
                  descricao
                ),
                conta_bancaria:contas_bancarias (
                  descricao,
                  banco
                ),
                centro_custo
              `)
              .eq('id', sol.lancamento_id)
              .maybeSingle();
            
            if (lancamento) {
              // Buscar centro de custo separadamente se existir
              let centroCustoInfo = undefined;
              if (lancamento.centro_custo) {
                const { data: cc } = await supabase
                  .from('centros_custo')
                  .select('codigo, descricao')
                  .eq('codigo', lancamento.centro_custo)
                  .maybeSingle();
                centroCustoInfo = cc || undefined;
              }
              
              lancamentoDetalhes = {
                id: lancamento.id,
                descricao: lancamento.descricao,
                data_competencia: lancamento.data_competencia,
                status: lancamento.status,
                observacoes: lancamento.observacoes,
                numero_nf: lancamento.numero_nf,
                cliente: lancamento.cliente as any,
                plano_conta: lancamento.plano_conta as any,
                conta_bancaria: lancamento.conta_bancaria as any,
                centro_custo_info: centroCustoInfo,
              };
            }
          } else {
            const { data: lancamento } = await supabase
              .from('contas_pagar')
              .select(`
                id,
                descricao,
                data_competencia,
                status,
                observacoes,
                fornecedor:fornecedores (
                  razao_social,
                  nome_fantasia,
                  cnpj_cpf
                ),
                plano_conta:plano_contas (
                  codigo,
                  descricao
                ),
                conta_bancaria:contas_bancarias (
                  descricao,
                  banco
                ),
                centro_custo
              `)
              .eq('id', sol.lancamento_id)
              .maybeSingle();
            
            if (lancamento) {
              // Buscar centro de custo separadamente se existir
              let centroCustoInfo = undefined;
              if (lancamento.centro_custo) {
                const { data: cc } = await supabase
                  .from('centros_custo')
                  .select('codigo, descricao')
                  .eq('codigo', lancamento.centro_custo)
                  .maybeSingle();
                centroCustoInfo = cc || undefined;
              }
              
              lancamentoDetalhes = {
                id: lancamento.id,
                descricao: lancamento.descricao,
                data_competencia: lancamento.data_competencia,
                status: lancamento.status,
                observacoes: lancamento.observacoes,
                fornecedor: lancamento.fornecedor as any,
                plano_conta: lancamento.plano_conta as any,
                conta_bancaria: lancamento.conta_bancaria as any,
                centro_custo_info: centroCustoInfo,
              };
            }
          }
          
          return {
            ...sol,
            solicitante: solicitanteData || { nome: 'Desconhecido', email: '' },
            aprovador: aprovadorData,
            lancamento: lancamentoDetalhes,
          };
        })
      );
      
      setSolicitacoes(solicitacoesComPerfis);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as solicitações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfirmDialog = (solicitacao: SolicitacaoAjuste, action: 'aprovar' | 'rejeitar') => {
    setConfirmDialog({ open: true, solicitacao, action });
  };

  const createNotification = async (userId: string, titulo: string, mensagem: string, tipo: string, referenciaId: string) => {
    try {
      await supabase
        .from('notificacoes')
        .insert({
          user_id: userId,
          titulo,
          mensagem,
          tipo,
          referencia_id: referenciaId,
          referencia_tipo: 'solicitacao_ajuste',
        });
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
    }
  };

  const handleAprovarAjuste = async () => {
    const solicitacao = confirmDialog.solicitacao;
    if (!solicitacao) return;

    setLoading(true);
    try {
      const tabela = solicitacao.tipo_lancamento === 'receber' ? 'contas_receber' : 'contas_pagar';
      
      // Construir objeto de atualização apenas com campos alterados
      const updateData: any = {};
      
      if (solicitacao.data_vencimento_atual !== solicitacao.data_vencimento_solicitada) {
        updateData.data_vencimento = solicitacao.data_vencimento_solicitada;
      }
      
      if ((solicitacao.juros_atual || 0) !== (solicitacao.juros_solicitado || 0)) {
        updateData.juros = solicitacao.juros_solicitado || 0;
      }
      
      if ((solicitacao.multa_atual || 0) !== (solicitacao.multa_solicitada || 0)) {
        updateData.multa = solicitacao.multa_solicitada || 0;
      }
      
      if ((solicitacao.desconto_atual || 0) !== (solicitacao.desconto_solicitado || 0)) {
        updateData.desconto = solicitacao.desconto_solicitado || 0;
      }
      
      // Buscar valores atuais do lançamento
      const { data: lancamentoAtual, error: fetchError } = await supabase
        .from(tabela)
        .select('plano_conta_id, centro_custo, conta_bancaria_id')
        .eq('id', solicitacao.lancamento_id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (lancamentoAtual && solicitacao.plano_conta_id && lancamentoAtual.plano_conta_id !== solicitacao.plano_conta_id) {
        updateData.plano_conta_id = solicitacao.plano_conta_id;
      }
      
      if (lancamentoAtual && solicitacao.centro_custo && lancamentoAtual.centro_custo !== solicitacao.centro_custo) {
        updateData.centro_custo = solicitacao.centro_custo;
      }
      
      if (lancamentoAtual && solicitacao.conta_bancaria_id && lancamentoAtual.conta_bancaria_id !== solicitacao.conta_bancaria_id) {
        updateData.conta_bancaria_id = solicitacao.conta_bancaria_id;
      }
      
      // Atualizar apenas se houver mudanças
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from(tabela)
          .update(updateData)
          .eq('id', solicitacao.lancamento_id);

        if (updateError) throw updateError;
      }

      // Marcar solicitação como aprovada
      const { error: solicitacaoError } = await supabase
        .from('solicitacoes_ajuste_financeiro')
        .update({
          status: 'aprovada',
          aprovador_id: user?.id,
          data_resposta: new Date().toISOString(),
        })
        .eq('id', solicitacao.id);

      if (solicitacaoError) throw solicitacaoError;

      // Criar notificação para o solicitante
      await createNotification(
        solicitacao.solicitante_id,
        'Solicitação Aprovada',
        `Sua solicitação de ajuste de ${solicitacao.tipo_lancamento === 'receber' ? 'conta a receber' : 'conta a pagar'} foi aprovada.`,
        'aprovado',
        solicitacao.id
      );

      toast({
        title: 'Ajuste aprovado',
        description: 'O lançamento foi atualizado com sucesso.',
      });

      loadSolicitacoes();
      setConfirmDialog({ open: false, solicitacao: null, action: null });
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      toast({
        title: 'Erro ao aprovar',
        description: 'Não foi possível aprovar o ajuste.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejeitarAjuste = async () => {
    const solicitacao = confirmDialog.solicitacao;
    if (!solicitacao) return;

    if (!motivoRejeicao.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Por favor, informe o motivo da rejeição.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('solicitacoes_ajuste_financeiro')
        .update({
          status: 'rejeitada',
          aprovador_id: user?.id,
          data_resposta: new Date().toISOString(),
          motivo_rejeicao: motivoRejeicao.trim(),
        })
        .eq('id', solicitacao.id);

      if (error) throw error;

      // Criar notificação para o solicitante com o motivo da rejeição
      await createNotification(
        solicitacao.solicitante_id,
        'Solicitação Rejeitada',
        `Sua solicitação de ajuste de ${solicitacao.tipo_lancamento === 'receber' ? 'conta a receber' : 'conta a pagar'} foi rejeitada. Motivo: ${motivoRejeicao.trim()}`,
        'rejeitado',
        solicitacao.id
      );

      toast({
        title: 'Solicitação rejeitada',
        description: 'A solicitação foi rejeitada.',
      });

      loadSolicitacoes();
      setConfirmDialog({ open: false, solicitacao: null, action: null });
      setMotivoRejeicao('');
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
      toast({
        title: 'Erro ao rejeitar',
        description: 'Não foi possível rejeitar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarSolicitacao = async (solicitacaoId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('solicitacoes_ajuste_financeiro')
        .delete()
        .eq('id', solicitacaoId);

      if (error) throw error;

      toast({
        title: 'Solicitação cancelada',
        description: 'A solicitação foi cancelada com sucesso.',
      });

      loadSolicitacoes();
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast({
        title: 'Erro ao cancelar',
        description: 'Não foi possível cancelar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSolicitacao = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(solicitacoesPendentes.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBatchAprovar = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    
    try {
      for (const id of selectedIds) {
        const solicitacao = solicitacoes.find((s) => s.id === id);
        if (!solicitacao || solicitacao.status !== 'pendente') continue;
        
        const tabela = solicitacao.tipo_lancamento === 'receber' ? 'contas_receber' : 'contas_pagar';
        const updateData: any = {};
        
        if (solicitacao.data_vencimento_atual !== solicitacao.data_vencimento_solicitada) {
          updateData.data_vencimento = solicitacao.data_vencimento_solicitada;
        }
        if ((solicitacao.juros_atual || 0) !== (solicitacao.juros_solicitado || 0)) {
          updateData.juros = solicitacao.juros_solicitado || 0;
        }
        if ((solicitacao.multa_atual || 0) !== (solicitacao.multa_solicitada || 0)) {
          updateData.multa = solicitacao.multa_solicitada || 0;
        }
        if ((solicitacao.desconto_atual || 0) !== (solicitacao.desconto_solicitado || 0)) {
          updateData.desconto = solicitacao.desconto_solicitado || 0;
        }
        
        // Buscar valores atuais do lançamento
        const { data: lancamentoAtual } = await supabase
          .from(tabela)
          .select('plano_conta_id, centro_custo, conta_bancaria_id')
          .eq('id', solicitacao.lancamento_id)
          .single();
        
        if (lancamentoAtual && solicitacao.plano_conta_id && lancamentoAtual.plano_conta_id !== solicitacao.plano_conta_id) {
          updateData.plano_conta_id = solicitacao.plano_conta_id;
        }
        if (lancamentoAtual && solicitacao.centro_custo && lancamentoAtual.centro_custo !== solicitacao.centro_custo) {
          updateData.centro_custo = solicitacao.centro_custo;
        }
        if (lancamentoAtual && solicitacao.conta_bancaria_id && lancamentoAtual.conta_bancaria_id !== solicitacao.conta_bancaria_id) {
          updateData.conta_bancaria_id = solicitacao.conta_bancaria_id;
        }
        
        if (Object.keys(updateData).length > 0) {
          await supabase.from(tabela).update(updateData).eq('id', solicitacao.lancamento_id);
        }
        
        await supabase
          .from('solicitacoes_ajuste_financeiro')
          .update({
            status: 'aprovada',
            aprovador_id: user?.id,
            data_resposta: new Date().toISOString(),
          })
          .eq('id', solicitacao.id);
        
        await createNotification(
          solicitacao.solicitante_id,
          'Solicitação Aprovada',
          `Sua solicitação de ajuste de ${solicitacao.tipo_lancamento === 'receber' ? 'conta a receber' : 'conta a pagar'} foi aprovada.`,
          'aprovado',
          solicitacao.id
        );
      }
      
      toast({
        title: 'Solicitações aprovadas',
        description: `${selectedIds.length} solicitação(ões) aprovada(s) com sucesso.`,
      });
      
      setSelectedIds([]);
      setBatchDialog({ open: false, action: null });
      loadSolicitacoes();
    } catch (error) {
      console.error('Erro ao aprovar em lote:', error);
      toast({
        title: 'Erro ao aprovar',
        description: 'Não foi possível aprovar algumas solicitações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchRejeitar = async () => {
    if (selectedIds.length === 0 || !batchMotivoRejeicao.trim()) return;
    setLoading(true);
    
    try {
      for (const id of selectedIds) {
        const solicitacao = solicitacoes.find((s) => s.id === id);
        if (!solicitacao || solicitacao.status !== 'pendente') continue;
        
        await supabase
          .from('solicitacoes_ajuste_financeiro')
          .update({
            status: 'rejeitada',
            aprovador_id: user?.id,
            data_resposta: new Date().toISOString(),
            motivo_rejeicao: batchMotivoRejeicao.trim(),
          })
          .eq('id', solicitacao.id);
        
        await createNotification(
          solicitacao.solicitante_id,
          'Solicitação Rejeitada',
          `Sua solicitação de ajuste de ${solicitacao.tipo_lancamento === 'receber' ? 'conta a receber' : 'conta a pagar'} foi rejeitada. Motivo: ${batchMotivoRejeicao.trim()}`,
          'rejeitado',
          solicitacao.id
        );
      }
      
      toast({
        title: 'Solicitações rejeitadas',
        description: `${selectedIds.length} solicitação(ões) rejeitada(s).`,
      });
      
      setSelectedIds([]);
      setBatchDialog({ open: false, action: null });
      setBatchMotivoRejeicao('');
      loadSolicitacoes();
    } catch (error) {
      console.error('Erro ao rejeitar em lote:', error);
      toast({
        title: 'Erro ao rejeitar',
        description: 'Não foi possível rejeitar algumas solicitações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const solicitacoesPendentes = solicitacoes.filter((s) => s.status === 'pendente');
  const solicitacoesHistorico = solicitacoes.filter((s) => s.status !== 'pendente');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'aprovado':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20"><Check className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejeitado':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20"><X className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const renderSolicitacaoCard = (solicitacao: SolicitacaoAjuste, showCheckbox = false) => {
    const hasChangedDate = solicitacao.data_vencimento_atual !== solicitacao.data_vencimento_solicitada;
    const hasChangedJuros = solicitacao.juros_atual !== solicitacao.juros_solicitado;
    const hasChangedMulta = solicitacao.multa_atual !== solicitacao.multa_solicitada;
    const hasChangedDesconto = solicitacao.desconto_atual !== solicitacao.desconto_solicitado;
    const lancamento = solicitacao.lancamento;

    const getStatusLabel = (status: string | null) => {
      switch (status) {
        case 'pendente': return { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' };
        case 'pago': return { label: 'Pago', color: 'bg-green-500/10 text-green-600 border-green-500/20' };
        case 'recebido': return { label: 'Recebido', color: 'bg-green-500/10 text-green-600 border-green-500/20' };
        case 'vencido': return { label: 'Vencido', color: 'bg-red-500/10 text-red-600 border-red-500/20' };
        case 'cancelado': return { label: 'Cancelado', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
        default: return { label: status || 'N/A', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
      }
    };

    return (
      <Card key={solicitacao.id} className="overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            {/* Checkbox for batch selection */}
            {showCheckbox && isAdmin && solicitacao.status === 'pendente' && (
              <div className="pt-1">
                <Checkbox
                  checked={selectedIds.includes(solicitacao.id)}
                  onCheckedChange={(checked) => handleSelectSolicitacao(solicitacao.id, !!checked)}
                />
              </div>
            )}
            {/* Left Section - Info */}
            <div className="flex-1 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant={solicitacao.tipo_lancamento === 'receber' ? 'default' : 'secondary'}>
                  {solicitacao.tipo_lancamento === 'receber' ? 'Contas a Receber' : 'Contas a Pagar'}
                </Badge>
                {getStatusBadge(solicitacao.status)}
                {lancamento?.centro_custo_info && (
                  <CompanyTag codigo={lancamento.centro_custo_info.codigo} />
                )}
              </div>

              {/* Detalhes do Lançamento */}
              {lancamento && (
                <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold text-primary">Detalhes do Lançamento</p>
                  </div>
                  
                  {/* Cliente/Fornecedor */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lancamento.cliente && (
                      <div className="flex items-start gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Cliente</p>
                          <p className="text-sm font-medium">{lancamento.cliente.nome_fantasia || lancamento.cliente.razao_social}</p>
                          <p className="text-xs text-muted-foreground">{lancamento.cliente.cnpj_cpf}</p>
                        </div>
                      </div>
                    )}
                    {lancamento.fornecedor && (
                      <div className="flex items-start gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Fornecedor</p>
                          <p className="text-sm font-medium">{lancamento.fornecedor.nome_fantasia || lancamento.fornecedor.razao_social}</p>
                          <p className="text-xs text-muted-foreground">{lancamento.fornecedor.cnpj_cpf}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Status do Lançamento */}
                    <div className="flex items-start gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Status do Lançamento</p>
                        <Badge variant="outline" className={getStatusLabel(lancamento.status).color}>
                          {getStatusLabel(lancamento.status).label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Descrição */}
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Descrição</p>
                      <p className="text-sm font-medium">{lancamento.descricao}</p>
                    </div>
                  </div>
                  
                  {/* Grid de informações */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-primary/10">
                    {lancamento.data_competencia && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Competência
                        </p>
                        <p className="text-sm font-medium">{format(new Date(lancamento.data_competencia), 'MM/yyyy')}</p>
                      </div>
                    )}
                    
                    {lancamento.numero_nf && (
                      <div>
                        <p className="text-xs text-muted-foreground">Nº NF</p>
                        <p className="text-sm font-medium">{lancamento.numero_nf}</p>
                      </div>
                    )}
                    
                    {lancamento.plano_conta && (
                      <div>
                        <p className="text-xs text-muted-foreground">Plano de Contas</p>
                        <p className="text-sm font-medium">{lancamento.plano_conta.codigo}</p>
                        <p className="text-xs text-muted-foreground">{lancamento.plano_conta.descricao}</p>
                      </div>
                    )}
                    
                    {lancamento.conta_bancaria && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Banknote className="w-3 h-3" />
                          Conta Bancária
                        </p>
                        <p className="text-sm font-medium">{lancamento.conta_bancaria.descricao}</p>
                        <p className="text-xs text-muted-foreground">{lancamento.conta_bancaria.banco}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Observações */}
                  {lancamento.observacoes && (
                    <div className="pt-2 border-t border-primary/10">
                      <p className="text-xs text-muted-foreground">Observações</p>
                      <p className="text-sm text-muted-foreground italic">{lancamento.observacoes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Solicitante */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Solicitado por:</p>
                  <p className="font-medium">{solicitacao.solicitante.nome}</p>
                  <p className="text-xs text-muted-foreground">{solicitacao.solicitante.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data:</p>
                  <p className="font-medium">{format(new Date(solicitacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              </div>

              {/* Aprovador (se houver) */}
              {solicitacao.aprovador && solicitacao.data_resposta && (
                <div className="bg-secondary/30 p-3 rounded-md text-sm">
                  <p className="text-muted-foreground">
                    {solicitacao.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'} por: <span className="font-medium">{solicitacao.aprovador.nome}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(solicitacao.data_resposta), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}

              {/* Motivo */}
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-xs font-medium text-muted-foreground mb-1">Motivo da Solicitação:</p>
                <p className="text-sm">{solicitacao.motivo_solicitacao}</p>
              </div>

              {/* Motivo da Rejeição (se houver) */}
              {solicitacao.status === 'rejeitada' && solicitacao.motivo_rejeicao && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-md">
                  <p className="text-xs font-medium text-red-600 mb-1">Motivo da Rejeição:</p>
                  <p className="text-sm text-red-700">{solicitacao.motivo_rejeicao}</p>
                </div>
              )}

              {/* Alterações */}
              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-3">Alterações Solicitadas</p>
                <div className="grid gap-2">
                  <div className="flex justify-between text-sm py-2 border-b">
                    <span className="text-muted-foreground">Valor Original:</span>
                    <span className="font-medium">R$ {solicitacao.valor_original.toFixed(2)}</span>
                  </div>
                  {hasChangedDate && (
                    <div className="flex justify-between text-sm py-2 border-b bg-orange-50 -mx-3 px-3">
                      <span className="text-muted-foreground">Data de Vencimento:</span>
                      <span className="font-medium text-orange-600">
                        {format(new Date(solicitacao.data_vencimento_atual), 'dd/MM/yyyy')} → {format(new Date(solicitacao.data_vencimento_solicitada), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  )}
                  {hasChangedJuros && (
                    <div className="flex justify-between text-sm py-2 border-b bg-orange-50 -mx-3 px-3">
                      <span className="text-muted-foreground">Juros:</span>
                      <span className="font-medium text-orange-600">
                        R$ {solicitacao.juros_atual.toFixed(2)} → R$ {solicitacao.juros_solicitado.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {hasChangedMulta && (
                    <div className="flex justify-between text-sm py-2 border-b bg-orange-50 -mx-3 px-3">
                      <span className="text-muted-foreground">Multa:</span>
                      <span className="font-medium text-orange-600">
                        R$ {solicitacao.multa_atual.toFixed(2)} → R$ {solicitacao.multa_solicitada.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {hasChangedDesconto && (
                    <div className="flex justify-between text-sm py-2 bg-orange-50 -mx-3 px-3">
                      <span className="text-muted-foreground">Desconto:</span>
                      <span className="font-medium text-orange-600">
                        R$ {solicitacao.desconto_atual.toFixed(2)} → R$ {solicitacao.desconto_solicitado.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section - Actions */}
            {isAdmin && solicitacao.status === 'pendente' && (
              <div className="flex flex-col gap-2 pt-12">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleOpenConfirmDialog(solicitacao, 'aprovar')}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 border-red-300"
                  onClick={() => handleOpenConfirmDialog(solicitacao, 'rejeitar')}
                >
                  <X className="w-4 h-4 mr-1" />
                  Rejeitar
                </Button>
              </div>
            )}
            
            {/* Cancel button for common users on pending requests */}
            {!isAdmin && solicitacao.status === 'pendente' && (
              <div className="flex flex-col gap-2 pt-12">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 border-red-300"
                  onClick={() => handleCancelarSolicitacao(solicitacao.id)}
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando solicitações...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Solicitações de Ajuste</h1>
            <p className="text-muted-foreground">
              {isAdmin 
                ? 'Gerencie e aprove solicitações de ajustes financeiros' 
                : 'Acompanhe suas solicitações de ajuste'}
            </p>
          </div>
        </div>

        {isAdmin ? (
          <Tabs defaultValue="pendentes" className="w-full">
            <TabsList>
              <TabsTrigger value="pendentes" className="gap-2">
                <Clock className="w-4 h-4" />
                Pendentes ({solicitacoesPendentes.length})
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <FileText className="w-4 h-4" />
                Histórico ({solicitacoesHistorico.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pendentes" className="space-y-4 mt-6">
              {/* Batch Actions Bar */}
              {solicitacoesPendentes.length > 0 && (
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.length === solicitacoesPendentes.length && solicitacoesPendentes.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedIds.length > 0 
                        ? `${selectedIds.length} selecionada(s)` 
                        : 'Selecionar todas'}
                    </span>
                  </div>
                  {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2 ml-auto">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => setBatchDialog({ open: true, action: 'aprovar' })}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aprovar ({selectedIds.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 border-red-300"
                        onClick={() => setBatchDialog({ open: true, action: 'rejeitar' })}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Rejeitar ({selectedIds.length})
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {solicitacoesPendentes.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
                  </CardContent>
                </Card>
              ) : (
                solicitacoesPendentes.map((sol) => renderSolicitacaoCard(sol, true))
              )}
            </TabsContent>

            <TabsContent value="historico" className="space-y-4 mt-6">
              {solicitacoesHistorico.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum histórico disponível</p>
                  </CardContent>
                </Card>
              ) : (
                solicitacoesHistorico.map((sol) => renderSolicitacaoCard(sol, false))
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            {solicitacoes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Você ainda não fez nenhuma solicitação</p>
                </CardContent>
              </Card>
            ) : (
              solicitacoes.map((sol) => renderSolicitacaoCard(sol, false))
            )}
          </div>
        )}
      </div>

      {/* Dialog de Confirmação */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => {
        setConfirmDialog({ open, solicitacao: null, action: null });
        if (!open) setMotivoRejeicao('');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'aprovar' ? 'Aprovar Solicitação?' : 'Rejeitar Solicitação?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {confirmDialog.action === 'aprovar' ? (
                  <>
                    Você está prestes a aprovar esta solicitação. As seguintes alterações serão aplicadas ao lançamento:
                    {confirmDialog.solicitacao && (
                      <div className="mt-4 space-y-2 text-sm">
                        {confirmDialog.solicitacao.data_vencimento_atual !== confirmDialog.solicitacao.data_vencimento_solicitada && (
                          <p>
                            <strong>Data de Vencimento:</strong> {format(new Date(confirmDialog.solicitacao.data_vencimento_atual), 'dd/MM/yyyy')} → {format(new Date(confirmDialog.solicitacao.data_vencimento_solicitada), 'dd/MM/yyyy')}
                          </p>
                        )}
                        {confirmDialog.solicitacao.juros_atual !== confirmDialog.solicitacao.juros_solicitado && (
                          <p>
                            <strong>Juros:</strong> R$ {confirmDialog.solicitacao.juros_atual.toFixed(2)} → R$ {confirmDialog.solicitacao.juros_solicitado.toFixed(2)}
                          </p>
                        )}
                        {confirmDialog.solicitacao.multa_atual !== confirmDialog.solicitacao.multa_solicitada && (
                          <p>
                            <strong>Multa:</strong> R$ {confirmDialog.solicitacao.multa_atual.toFixed(2)} → R$ {confirmDialog.solicitacao.multa_solicitada.toFixed(2)}
                          </p>
                        )}
                        {confirmDialog.solicitacao.desconto_atual !== confirmDialog.solicitacao.desconto_solicitado && (
                          <p>
                            <strong>Desconto:</strong> R$ {confirmDialog.solicitacao.desconto_atual.toFixed(2)} → R$ {confirmDialog.solicitacao.desconto_solicitado.toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <p>Você está prestes a rejeitar esta solicitação. Esta ação não poderá ser desfeita.</p>
                    <div className="space-y-2">
                      <Label htmlFor="motivo-rejeicao" className="text-foreground">
                        Motivo da Rejeição <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="motivo-rejeicao"
                        placeholder="Informe o motivo da rejeição..."
                        value={motivoRejeicao}
                        onChange={(e) => setMotivoRejeicao(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialog.action === 'aprovar' ? handleAprovarAjuste : handleRejeitarAjuste}
              disabled={loading || (confirmDialog.action === 'rejeitar' && !motivoRejeicao.trim())}
              className={confirmDialog.action === 'aprovar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {loading ? 'Processando...' : confirmDialog.action === 'aprovar' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação para Ações em Lote */}
      <AlertDialog open={batchDialog.open} onOpenChange={(open) => {
        setBatchDialog({ open, action: null });
        if (!open) setBatchMotivoRejeicao('');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {batchDialog.action === 'aprovar' 
                ? `Aprovar ${selectedIds.length} Solicitação(ões)?` 
                : `Rejeitar ${selectedIds.length} Solicitação(ões)?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {batchDialog.action === 'aprovar' ? (
                  <p>
                    Você está prestes a aprovar <strong>{selectedIds.length}</strong> solicitação(ões). 
                    Todas as alterações solicitadas serão aplicadas aos lançamentos correspondentes.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p>
                      Você está prestes a rejeitar <strong>{selectedIds.length}</strong> solicitação(ões). 
                      Esta ação não poderá ser desfeita.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="batch-motivo-rejeicao" className="text-foreground">
                        Motivo da Rejeição <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="batch-motivo-rejeicao"
                        placeholder="Informe o motivo da rejeição (aplicado a todas as solicitações selecionadas)..."
                        value={batchMotivoRejeicao}
                        onChange={(e) => setBatchMotivoRejeicao(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={batchDialog.action === 'aprovar' ? handleBatchAprovar : handleBatchRejeitar}
              disabled={loading || (batchDialog.action === 'rejeitar' && !batchMotivoRejeicao.trim())}
              className={batchDialog.action === 'aprovar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {loading 
                ? 'Processando...' 
                : batchDialog.action === 'aprovar' 
                  ? `Aprovar (${selectedIds.length})` 
                  : `Rejeitar (${selectedIds.length})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}