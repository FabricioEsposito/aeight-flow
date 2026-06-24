import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ExternalLink, Check, X, Loader2, Eye, Crown, AlertCircle, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from 'date-fns';
import { DateRangeFilter, type DateRangePreset } from '@/components/financeiro/DateRangeFilter';
import { ptBR } from 'date-fns/locale';
import { openStorageFile } from '@/lib/storage-utils';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const exportSolicitacoesToExcel = (rows: any[], centrosCusto: any[], filename: string) => {
  const data = rows.map((s) => {
    const cc = centrosCusto.find((c: any) => c.id === s._centro_custo);
    const cidadeEstado = [s.fornecedor?.cidade, s.fornecedor?.uf].filter(Boolean).join('/');
    return {
      'Razão Social': s.fornecedor?.razao_social || '',
      'Nome Fantasia': s.fornecedor?.nome_fantasia || '',
      'Centro de Custo': cc ? `${cc.codigo} - ${cc.descricao}` : '',
      'CNPJ': s.fornecedor?.cnpj_cpf || '',
      'Data de Solicitação': s.created_at ? format(new Date(s.created_at), 'dd/MM/yyyy', { locale: ptBR }) : '',
      'Data de Emissão da NF': s.data_emissao_nf ? format(new Date(`${s.data_emissao_nf}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR }) : '',
      'Número da NF': s.numero_nf || '',
      'Cidade/Estado': cidadeEstado,
    };
  });
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 35 }, { wch: 30 }, { wch: 28 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Solicitações');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

type Step = 'lider' | 'rh_analista' | 'rh_gerente' | 'financeiro';

const getRegimeFromProfile = (regime?: string | null) => {
  if (regime === 'funcionario') return 'funcionario';
  if (regime === 'prestador_servico') return 'prestador';
  return null;
};

const enrichSolicitacoes = async (rows: any[]) => {
  const solicitanteIds = Array.from(new Set(rows.map((r) => r.solicitante_id).filter(Boolean)));
  const { data: perfis } = solicitanteIds.length
    ? await supabase.from('profiles').select('id, fornecedor_id, regime_contrato' as any).in('id', solicitanteIds)
    : { data: [] as any[] };

  const perfilMap = new Map((perfis || []).map((p: any) => [p.id, p]));
  const fornecedorIds = Array.from(new Set(rows.map((r) => perfilMap.get(r.solicitante_id)?.fornecedor_id || r.fornecedor_id).filter(Boolean)));

  const { data: contratos } = fornecedorIds.length
    ? await supabase
        .from('contratos')
        .select('fornecedor_id, centro_custo, is_folha_funcionario, is_beneficio_funcionario, status')
        .in('fornecedor_id', fornecedorIds)
        .eq('status', 'ativo')
    : { data: [] as any[] };

  const contratoMap: Record<string, { centro_custo: string | null; regime: string }> = {};
  (contratos || []).forEach((c: any) => {
    if (!contratoMap[c.fornecedor_id]) {
      contratoMap[c.fornecedor_id] = {
        centro_custo: c.centro_custo || null,
        regime: c.is_folha_funcionario || c.is_beneficio_funcionario ? 'funcionario' : 'prestador',
      };
    }
  });

  return rows.map((r) => {
    const perfil = perfilMap.get(r.solicitante_id);
    const fornecedorVinculadoId = perfil?.fornecedor_id || r.fornecedor_id;
    const contrato = contratoMap[fornecedorVinculadoId];
    return {
      ...r,
      _fornecedor_vinculado_id: fornecedorVinculadoId,
      _centro_custo: contrato?.centro_custo || null,
      _regime: getRegimeFromProfile(perfil?.regime_contrato) || contrato?.regime || 'prestador',
    };
  });
};

const filtrarSolicitacoes = (
  rows: any[],
  dateRange: { from?: Date; to?: Date },
  filtroCC: string,
  filtroTipo: string,
  filtroRegime: string,
) => rows.filter((s: any) => {
  if (dateRange.from && new Date(s.created_at) < dateRange.from) return false;
  if (dateRange.to) {
    const end = new Date(dateRange.to); end.setHours(23,59,59,999);
    if (new Date(s.created_at) > end) return false;
  }
  if (filtroCC !== 'todos' && s._centro_custo !== filtroCC) return false;
  if (filtroTipo !== 'todos' && s.tipo !== filtroTipo) return false;
  if (filtroRegime !== 'todos' && s._regime !== filtroRegime) return false;
  return true;
});

export default function AprovacaoPrestadores() {
  const { permissions, isAdmin, isFinanceManager, isLiderArea, isRHAnalyst, isRHManager, loading: roleLoading } = useUserRole();
  const canLider = isAdmin || isLiderArea;
  const canRHAnalista = isAdmin || isRHAnalyst || isRHManager;
  const canRHGerente = isAdmin || isRHManager;
  const canFin = isAdmin || isFinanceManager || permissions.canApproveReembolsoFinanceiro;

  if (roleLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  if (!canLider && !canRHAnalista && !canRHGerente && !canFin) return <Navigate to="/" replace />;

  const defaultTab: string = canLider ? 'lider' : canRHAnalista ? 'rh_analista' : canRHGerente ? 'rh_gerente' : canFin ? 'financeiro' : 'historico';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Aprovações de Prestadores</h1>
        <p className="text-muted-foreground">Valide reembolsos e Notas Fiscais enviadas pelos prestadores e funcionários.</p>
      </div>
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {canLider && <TabsTrigger value="lider">Aprovação Líder</TabsTrigger>}
          {canRHAnalista && <TabsTrigger value="rh_analista">Validação Analista RH</TabsTrigger>}
          {canRHGerente && <TabsTrigger value="rh_gerente">Aprovação Gerente RH</TabsTrigger>}
          {canFin && <TabsTrigger value="financeiro">Aprovação Financeiro</TabsTrigger>}
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        {canLider && <TabsContent value="lider"><PainelStep step="lider" /></TabsContent>}
        {canRHAnalista && <TabsContent value="rh_analista"><PainelStep step="rh_analista" /></TabsContent>}
        {canRHGerente && <TabsContent value="rh_gerente"><PainelStep step="rh_gerente" /></TabsContent>}
        {canFin && <TabsContent value="financeiro"><PainelStep step="financeiro" /></TabsContent>}
        <TabsContent value="historico"><HistoricoPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function isBatchEligible(step: Step, item: any) {
  if (step === 'rh_gerente' && item.tipo === 'nf_mensal') return false;
  if (step === 'financeiro' && item.tipo === 'reembolso') return false;
  return true;
}

function PainelStep({ step }: { step: Step }) {
  const { user } = useAuth();
  const { isAdmin, isRHAnalyst, isRHManager } = useUserRole();
  const canExport = isAdmin || isRHAnalyst || isRHManager;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [aprovarItem, setAprovarItem] = useState<any>(null);
  const [rejeitarItem, setRejeitarItem] = useState<any>(null);
  const [detalheItem, setDetalheItem] = useState<any>(null);
  const [motivo, setMotivo] = useState('');
  const [parcelaId, setParcelaId] = useState('');
  const [dataVenc, setDataVenc] = useState('');
  const [contaBanc, setContaBanc] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [aprovarLoteOpen, setAprovarLoteOpen] = useState(false);
  const [rejeitarLoteOpen, setRejeitarLoteOpen] = useState(false);
  const [motivoLote, setMotivoLote] = useState('');
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);

  // rh_analista vê NF mensal (vinda direto do solicitante como 'aprovado_lider')
  // E também reembolsos novos ('pendente_rh_analista') — primeira parada no fluxo novo de reembolso.
  const statusFiltros: string[] =
    step === 'lider' ? ['pendente_lider']
    : step === 'rh_analista' ? ['aprovado_lider', 'pendente_rh_analista']
    : step === 'rh_gerente' ? ['pendente_rh']
    : ['aprovado_rh'];

  const { data: items = [] } = useQuery({
    queryKey: ['aprov-prestador', step, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('solicitacoes_prestador' as any)
        .select('*, fornecedor:fornecedores(razao_social, nome_fantasia, cnpj_cpf, cidade, uf)')
        .in('status', statusFiltros)
        .order('created_at');

      // Líder: apenas solicitações de membros do(s) grupo(s) que ele lidera
      if (step === 'lider') {
        const { data: grupos } = await supabase
          .from('grupos_area')
          .select('id')
          .eq('lider_user_id', user!.id);
        const grupoIds = (grupos || []).map((g: any) => g.id);
        if (!grupoIds.length) return [];
        const { data: membros } = await supabase
          .from('profiles')
          .select('id')
          .in('grupo_id', grupoIds);
        const memberIds = (membros || []).map((m: any) => m.id);
        if (!memberIds.length) return [];
        query = query.in('solicitante_id', memberIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data as any[]) || [];
      return enrichSolicitacoes(rows);
    },
  });


  // Filtros
  const [datePreset, setDatePreset] = useState<DateRangePreset>('todo-periodo');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [filtroCC, setFiltroCC] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroRegime, setFiltroRegime] = useState<string>('todos');

  const handleDateChange = (preset: DateRangePreset, range?: { from: Date | undefined; to: Date | undefined }) => {
    setDatePreset(preset);
    if (preset === 'todo-periodo') { setDateRange({}); return; }
    if (range?.from && range?.to) { setDateRange({ from: range.from, to: range.to }); return; }
    const today = new Date();
    const r = (() => {
      switch (preset) {
        case 'hoje': return { from: today, to: today };
        case 'esta-semana': return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) };
        case 'este-mes': return { from: startOfMonth(today), to: endOfMonth(today) };
        case 'este-ano': return { from: startOfYear(today), to: endOfYear(today) };
        case 'ultimos-30-dias': return { from: subDays(today, 30), to: today };
        case 'ultimos-12-meses': return { from: subMonths(today, 12), to: today };
        default: return { from: undefined, to: undefined };
      }
    })();
    setDateRange(r);
  };

  const { data: centrosCusto = [] } = useQuery({
    queryKey: ['centros-custo-filter'],
    queryFn: async () => {
      const { data } = await supabase.from('centros_custo').select('id, codigo, descricao').eq('status', 'ativo').order('codigo');
      return data || [];
    },
  });

  const itemsFiltrados = filtrarSolicitacoes(items, dateRange, filtroCC, filtroTipo, filtroRegime);

  const { data: parcelas = [] } = useQuery({
    queryKey: ['parcelas-prestador', aprovarItem?.fornecedor_id, aprovarItem?.mes_referencia, aprovarItem?.ano_referencia],
    enabled: !!aprovarItem && aprovarItem?.tipo === 'nf_mensal' && step === 'rh_gerente',
    queryFn: async () => {
      const { data: contratos } = await supabase
        .from('contratos')
        .select('id')
        .eq('fornecedor_id', aprovarItem.fornecedor_id);
      const ids = (contratos || []).map((c) => c.id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from('parcelas_contrato')
        .select('id, numero_parcela, data_vencimento, valor, status, contrato:contratos(numero_contrato)')
        .in('contrato_id', ids)
        .in('status', ['pendente', 'atrasado', 'parcial'])
        .order('data_vencimento');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contasBancarias = [] } = useQuery({
    queryKey: ['contas-bancarias-list'],
    enabled: step === 'financeiro',
    queryFn: async () => {
      const { data } = await supabase.from('contas_bancarias').select('id, descricao, banco').eq('status', 'ativo');
      return data || [];
    },
  });

  // Núcleo da aprovação para 1 item. Em lote, parcelaId/dataVenc/contaBanc são undefined
  // (itens que precisariam desses campos são excluídos da elegibilidade do lote).
  const aprovarUmItem = async (
    item: any,
    opts: { parcelaId?: string; dataVenc?: string; contaBanc?: string } = {},
  ) => {
    if (step === 'lider') {
      // Reembolso aprovado pelo líder → vai DIRETO para o financeiro (pula rh_gerente)
      const novoStatus = item.tipo === 'reembolso' ? 'aprovado_rh' : 'aprovado_lider';
      const { error } = await supabase.from('solicitacoes_prestador' as any).update({
        status: novoStatus,
        aprovador_lider_id: user!.id,
        data_aprovacao_lider: new Date().toISOString(),
      }).eq('id', item.id);
      if (error) throw error;
      if (item.tipo === 'reembolso') {
        try {
          await supabase.functions.invoke('notify-solicitacao-prestador', {
            body: { solicitacao_id: item.id, evento: 'aprovado_lider' },
          });
        } catch (err) { console.error('Erro email aprovado_lider:', err); }
        try {
          await supabase.functions.invoke('notify-solicitacao-prestador', {
            body: { solicitacao_id: item.id, evento: 'pendente_financeiro' },
          });
        } catch (err) { console.error('Erro email pendente_financeiro:', err); }
      }

    } else if (step === 'rh_analista') {
      // Reembolso aprovado pelo RH → vai para o líder. NF → mantém fluxo (pendente_rh).
      const novoStatus = item.tipo === 'reembolso' ? 'pendente_lider' : 'pendente_rh';
      const { error } = await supabase.from('solicitacoes_prestador' as any).update({
        status: novoStatus,
        aprovador_rh_analista_id: user!.id,
        data_aprovacao_rh_analista: new Date().toISOString(),
      }).eq('id', item.id);
      if (error) throw error;
      if (item.tipo === 'reembolso') {
        // Notifica o solicitante (aprovado pelo RH) e o líder (nova pendência)
        try {
          await supabase.functions.invoke('notify-solicitacao-prestador', {
            body: { solicitacao_id: item.id, evento: 'aprovado_rh' },
          });
        } catch (err) { console.error('Erro email aprovado_rh:', err); }
        try {
          await supabase.functions.invoke('notify-solicitacao-prestador', {
            body: { solicitacao_id: item.id, evento: 'pendente_lider' },
          });
        } catch (err) { console.error('Erro email pendente_lider:', err); }
        // Notificação in-app para o líder
        try {
          const { data: prof } = await supabase
            .from('profiles').select('grupo_id, nome').eq('id', item.solicitante_id).maybeSingle();
          const grupoId = (prof as any)?.grupo_id;
          if (grupoId) {
            const { data: grupo } = await supabase
              .from('grupos_area').select('lider_user_id').eq('id', grupoId).maybeSingle();
            const liderId = (grupo as any)?.lider_user_id;
            if (liderId) {
              await supabase.from('notificacoes').insert({
                user_id: liderId,
                titulo: 'Reembolso aguardando sua aprovação',
                mensagem: `${(prof as any)?.nome || 'Um colaborador'} enviou uma solicitação de reembolso que precisa da sua aprovação.`,
                tipo: 'info',
                referencia_tipo: 'solicitacao_prestador',
                referencia_id: item.id,
              });
            }
          }
        } catch (err) { console.error('Erro notificação in-app líder:', err); }
      }
    } else if (step === 'rh_gerente') {
      const update: any = {
        status: 'aprovado_rh',
        aprovador_rh_gerente_id: user!.id,
        data_aprovacao_rh_gerente: new Date().toISOString(),
        aprovador_rh_id: user!.id,
        data_aprovacao_rh: new Date().toISOString(),
      };
      if (item.tipo === 'nf_mensal') {
        if (!opts.parcelaId) throw new Error('Selecione a parcela');
        update.parcela_id = opts.parcelaId;
      }
      const { error } = await supabase.from('solicitacoes_prestador' as any).update(update).eq('id', item.id);
      if (error) throw error;
    } else {
      if (item.tipo === 'reembolso') {
        if (!opts.dataVenc) throw new Error('Defina a data de vencimento');
        const { data: plano } = await supabase.from('plano_contas').select('id').eq('codigo', '3.1.14').maybeSingle();
        const { data: cp, error: cpError } = await supabase.from('contas_pagar').insert({
          fornecedor_id: item.fornecedor_id,
          descricao: `Reembolso - ${item.descricao || ''}`.slice(0, 200),
          valor: item.valor,
          data_competencia: opts.dataVenc,
          data_vencimento: opts.dataVenc,
          plano_conta_id: plano?.id || null,
          conta_bancaria_id: opts.contaBanc || null,
          link_nf: item.arquivo_path,
          status: 'pendente',
        } as any).select('id').single();
        if (cpError) throw cpError;
        await supabase.from('solicitacoes_prestador' as any).update({
          status: 'aprovado_financeiro',
          aprovador_financeiro_id: user!.id,
          data_aprovacao_financeiro: new Date().toISOString(),
          conta_pagar_id: cp.id,
          data_vencimento_pagamento: opts.dataVenc,
          conta_bancaria_id: opts.contaBanc || null,
        }).eq('id', item.id);
      } else {
        if (item.tipo === 'nf_mensal' && item.parcela_id) {
          const { data: cp } = await supabase
            .from('contas_pagar').select('id').eq('parcela_id', item.parcela_id).maybeSingle();
          if (cp) {
            await supabase.from('contas_pagar').update({
              link_nf: item.arquivo_path,
            } as any).eq('id', cp.id);
          }
        }
        await supabase.from('solicitacoes_prestador' as any).update({
          status: 'aprovado_financeiro',
          aprovador_financeiro_id: user!.id,
          data_aprovacao_financeiro: new Date().toISOString(),
        }).eq('id', item.id);
      }
    }
    if (step === 'financeiro') {
      try {
        await supabase.functions.invoke('notify-solicitacao-prestador', {
          body: { solicitacao_id: item.id, evento: 'aprovado' },
        });
      } catch (err) {
        console.error('Erro ao enviar email de aprovação:', err);
      }
    }
  };


  const rejeitarUmItem = async (item: any, motivoRej: string) => {
    const now = new Date().toISOString();
    const update: any =
      step === 'lider' ? { status: 'rejeitado_lider', aprovador_lider_id: user!.id, data_aprovacao_lider: now, motivo_rejeicao_lider: motivoRej }
      : step === 'rh_analista' ? { status: 'rejeitado_rh', aprovador_rh_analista_id: user!.id, data_aprovacao_rh_analista: now, motivo_rejeicao_rh_analista: motivoRej, motivo_rejeicao_rh: motivoRej }
      : step === 'rh_gerente' ? { status: 'rejeitado_rh', aprovador_rh_gerente_id: user!.id, data_aprovacao_rh_gerente: now, motivo_rejeicao_rh_gerente: motivoRej, motivo_rejeicao_rh: motivoRej }
      : { status: 'rejeitado_financeiro', aprovador_financeiro_id: user!.id, data_aprovacao_financeiro: now, motivo_rejeicao_financeiro: motivoRej };
    const { error } = await supabase.from('solicitacoes_prestador' as any).update(update).eq('id', item.id);
    if (error) throw error;
    try {
      const etapa = step === 'lider' ? 'lider'
        : (step === 'rh_analista' || step === 'rh_gerente') ? 'rh'
        : 'financeiro';
      await supabase.functions.invoke('notify-solicitacao-prestador', {
        body: { solicitacao_id: item.id, evento: 'rejeitado', motivo: motivoRej, etapa },
      });
    } catch (err) {
      console.error('Erro ao enviar email de rejeição:', err);
    }
  };

  const handleAprovar = async () => {
    if (!aprovarItem) return;
    setProcessing(true);
    try {
      await aprovarUmItem(aprovarItem, { parcelaId, dataVenc, contaBanc });
      toast({ title: 'Aprovado!' });
      queryClient.invalidateQueries({ queryKey: ['aprov-prestador'] });
      queryClient.invalidateQueries({ queryKey: ['historico-prestador'] });
      setAprovarItem(null);
      setParcelaId(''); setDataVenc(''); setContaBanc('');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejeitar = async () => {
    if (!rejeitarItem || !motivo.trim()) return;
    setProcessing(true);
    try {
      await rejeitarUmItem(rejeitarItem, motivo);
      toast({ title: 'Rejeitado' });
      queryClient.invalidateQueries({ queryKey: ['aprov-prestador'] });
      queryClient.invalidateQueries({ queryKey: ['historico-prestador'] });
      setRejeitarItem(null); setMotivo('');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally { setProcessing(false); }
  };

  const runBatch = async (
    ids: string[],
    fn: (item: any) => Promise<void>,
    label: string,
  ) => {
    setProcessing(true);
    setBatchProgress({ done: 0, total: ids.length });
    let ok = 0; const errs: string[] = [];
    for (const id of ids) {
      const item = items.find((i: any) => i.id === id);
      if (!item) continue;
      try { await fn(item); ok++; } catch (e: any) { errs.push(e.message || 'erro'); }
      setBatchProgress((p) => p ? { ...p, done: p.done + 1 } : null);
    }
    setBatchProgress(null);
    setProcessing(false);
    queryClient.invalidateQueries({ queryKey: ['aprov-prestador'] });
    queryClient.invalidateQueries({ queryKey: ['historico-prestador'] });
    setSelected(new Set());
    if (errs.length) {
      toast({ title: `${label}: ${ok} ok, ${errs.length} com erro`, description: errs.slice(0, 3).join(' | '), variant: 'destructive' });
    } else {
      toast({ title: `${label} concluído`, description: `${ok} item(ns) processado(s).` });
    }
  };

  const handleAprovarLote = async () => {
    const ids = Array.from(selected).filter((id) => {
      const it = items.find((i: any) => i.id === id);
      return it && isBatchEligible(step, it);
    });
    if (!ids.length) return;
    setAprovarLoteOpen(false);
    await runBatch(ids, (item) => aprovarUmItem(item), 'Aprovação em lote');
  };

  const handleRejeitarLote = async () => {
    const ids = Array.from(selected);
    if (!ids.length || !motivoLote.trim()) return;
    const mot = motivoLote;
    setRejeitarLoteOpen(false);
    setMotivoLote('');
    await runBatch(ids, (item) => rejeitarUmItem(item, mot), 'Rejeição em lote');
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Pendentes</CardTitle></CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div>
            <Label className="text-xs block mb-1">Período</Label>
            <DateRangeFilter
              value={datePreset}
              onChange={handleDateChange}
              customRange={{ from: dateRange.from, to: dateRange.to }}
            />
          </div>
          <div>
            <Label className="text-xs">Centro de custo</Label>
            <Select value={filtroCC} onValueChange={setFiltroCC}>
              <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {centrosCusto.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="nf_mensal">NF</SelectItem>
                <SelectItem value="reembolso">Reembolso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Regime</Label>
            <Select value={filtroRegime} onValueChange={setFiltroRegime}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="prestador">Prestador de serviço</SelectItem>
                <SelectItem value="funcionario">Funcionário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {canExport && (
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportSolicitacoesToExcel(itemsFiltrados, centrosCusto, `aprovacoes-prestadores-${step}-${format(new Date(), 'yyyy-MM-dd')}`)}
                disabled={itemsFiltrados.length === 0}
              >
                <Download className="h-4 w-4 mr-1" /> Exportar Excel
              </Button>
            </div>
          )}
        </div>

        {itemsFiltrados.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma pendência.</p>
        ) : (
          <>
            {(() => {
              const elegiveis = itemsFiltrados.filter((s: any) => isBatchEligible(step, s));
              const allChecked = elegiveis.length > 0 && elegiveis.every((s: any) => selected.has(s.id));
              const someChecked = elegiveis.some((s: any) => selected.has(s.id));
              const selecionadosCount = itemsFiltrados.filter((s: any) => selected.has(s.id)).length;
              const selecionadosAprovaveis = elegiveis.filter((s: any) => selected.has(s.id)).length;
              return (
                <>
                  {selecionadosCount > 0 && (
                    <div className="flex items-center justify-between gap-3 mb-3 p-3 rounded-md border bg-muted/30">
                      <span className="text-sm">
                        <strong>{selecionadosCount}</strong> selecionado(s)
                        {selecionadosCount !== selecionadosAprovaveis && (
                          <span className="text-muted-foreground"> · {selecionadosAprovaveis} aprovável(is) em lote</span>
                        )}
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="default" disabled={processing || selecionadosAprovaveis === 0} onClick={() => setAprovarLoteOpen(true)}>
                          <Check className="h-4 w-4 mr-1" /> Aprovar selecionados
                        </Button>
                        <Button size="sm" variant="destructive" disabled={processing} onClick={() => { setMotivoLote(''); setRejeitarLoteOpen(true); }}>
                          <X className="h-4 w-4 mr-1" /> Rejeitar selecionados
                        </Button>
                        <Button size="sm" variant="ghost" disabled={processing} onClick={() => setSelected(new Set())}>Limpar</Button>
                      </div>
                    </div>
                  )}
                  {batchProgress && (
                    <div className="text-xs text-muted-foreground mb-2">Processando {batchProgress.done}/{batchProgress.total}…</div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">
                          <Checkbox
                            checked={allChecked ? true : (someChecked ? 'indeterminate' : false)}
                            onCheckedChange={(v) => {
                              if (v) {
                                const next = new Set(selected);
                                itemsFiltrados.forEach((s: any) => next.add(s.id));
                                setSelected(next);
                              } else {
                                setSelected(new Set());
                              }
                            }}
                          />
                        </TableHead>
                       <TableHead>Data solicitação</TableHead>
                       <TableHead>Data emissão NF</TableHead>
                       <TableHead>Tipo</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>CC</TableHead>
                        <TableHead>Regime</TableHead>
                        <TableHead>Mês ref.</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Anexo</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsFiltrados.map((s: any) => {
                        const elegivel = isBatchEligible(step, s);
                        return (
                          <TableRow key={s.id} data-state={selected.has(s.id) ? 'selected' : undefined}>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Checkbox
                                        checked={selected.has(s.id)}
                                        onCheckedChange={(v) => {
                                          const next = new Set(selected);
                                          if (v) next.add(s.id); else next.delete(s.id);
                                          setSelected(next);
                                        }}
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  {!elegivel && (
                                    <TooltipContent>
                                      {step === 'rh_gerente'
                                        ? 'NF mensal exige vincular parcela: aprove individualmente. Pode ser rejeitada em lote.'
                                        : 'Reembolso exige data de vencimento e conta bancária: aprove individualmente. Pode ser rejeitado em lote.'}
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="text-xs">{format(new Date(s.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                            <TableCell className="text-xs">{s.data_emissao_nf ? format(new Date(`${s.data_emissao_nf}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1">
                                {s.tipo === 'nf_mensal' ? 'NF' : 'Reembolso'}
                                {!elegivel && <AlertCircle className="h-3 w-3 text-muted-foreground" />}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{s.fornecedor?.nome_fantasia || s.fornecedor?.razao_social}</TableCell>
                            <TableCell className="text-xs">{(() => { const cc = centrosCusto.find((c: any) => c.id === s._centro_custo); return cc ? `${cc.codigo} - ${cc.descricao}` : '—'; })()}</TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="secondary">{s._regime === 'funcionario' ? 'Funcionário' : 'Prestador'}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">{String(s.mes_referencia).padStart(2,'0')}/{s.ano_referencia}</TableCell>
                            <TableCell className="text-sm max-w-xs truncate">{s.descricao}</TableCell>
                            <TableCell className="text-right text-sm">R$ {Number(s.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => openStorageFile(s.arquivo_path, 'prestador-docs')}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button size="sm" variant="outline" onClick={() => setDetalheItem(s)}><Eye className="h-4 w-4" /></Button>
                              <Button size="sm" variant="default" onClick={() => setAprovarItem(s)}><Check className="h-4 w-4" /></Button>
                              <Button size="sm" variant="destructive" onClick={() => setRejeitarItem(s)}><X className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              );
            })()}
          </>
        )}



        <Dialog open={!!aprovarItem} onOpenChange={(o) => !o && setAprovarItem(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Aprovar solicitação</DialogTitle></DialogHeader>
            {aprovarItem && step === 'rh_gerente' && aprovarItem.tipo === 'nf_mensal' && (
              <div>
                <Label>Vincular à parcela</Label>
                <Select value={parcelaId} onValueChange={setParcelaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a parcela" /></SelectTrigger>
                  <SelectContent>
                    {parcelas.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.contrato?.numero_contrato} • Parcela {p.numero_parcela} • {format(new Date(p.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy')} • R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {aprovarItem && step === 'financeiro' && aprovarItem.tipo === 'reembolso' && (
              <div className="space-y-3">
                <div>
                  <Label>Data de vencimento</Label>
                  <Input type="date" value={dataVenc} onChange={(e) => setDataVenc(e.target.value)} />
                </div>
                <div>
                  <Label>Conta bancária</Label>
                  <Select value={contaBanc} onValueChange={setContaBanc}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {contasBancarias.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.descricao} - {c.banco}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">Será criada uma conta a pagar com o plano 3.1.14 (Reembolso).</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAprovarItem(null)}>Cancelar</Button>
              <Button onClick={handleAprovar} disabled={processing}>
                {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!rejeitarItem} onOpenChange={(o) => !o && setRejeitarItem(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rejeitar</DialogTitle></DialogHeader>
            <Label>Motivo</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejeitarItem(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleRejeitar} disabled={processing || !motivo.trim()}>Rejeitar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={aprovarLoteOpen} onOpenChange={setAprovarLoteOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Aprovar em lote</DialogTitle></DialogHeader>
            <p className="text-sm">
              Confirmar aprovação de{' '}
              <strong>{Array.from(selected).filter((id) => { const it = items.find((i: any) => i.id === id); return it && isBatchEligible(step, it); }).length}</strong>{' '}
              solicitação(ões)?
            </p>
            {step === 'financeiro' && (
              <p className="text-xs text-muted-foreground">Será enviado e-mail de aprovação para cada fornecedor.</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAprovarLoteOpen(false)}>Cancelar</Button>
              <Button onClick={handleAprovarLote} disabled={processing}>
                {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={rejeitarLoteOpen} onOpenChange={setRejeitarLoteOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rejeitar em lote</DialogTitle></DialogHeader>
            <p className="text-sm">Rejeitar <strong>{selected.size}</strong> solicitação(ões). O motivo abaixo será aplicado a todas.</p>
            <Label>Motivo</Label>
            <Textarea value={motivoLote} onChange={(e) => setMotivoLote(e.target.value)} rows={3} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejeitarLoteOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleRejeitarLote} disabled={processing || !motivoLote.trim()}>
                {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Rejeitar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DetalheSolicitacaoDialog item={detalheItem} onClose={() => setDetalheItem(null)} />
      </CardContent>
    </Card>
  );
}

function statusLabel(s: string) {
  const map: Record<string, { label: string; variant: any }> = {
    pendente_lider: { label: 'Pendente Líder', variant: 'outline' },
    aprovado_lider: { label: 'Aprovado Líder', variant: 'secondary' },
    rejeitado_lider: { label: 'Rejeitado Líder', variant: 'destructive' },
    pendente_rh: { label: 'Pendente RH', variant: 'outline' },
    aprovado_rh: { label: 'Aprovado RH', variant: 'secondary' },
    rejeitado_rh: { label: 'Rejeitado RH', variant: 'destructive' },
    aprovado_financeiro: { label: 'Aprovado Financeiro', variant: 'default' },
    rejeitado_financeiro: { label: 'Rejeitado Financeiro', variant: 'destructive' },
  };
  return map[s] || { label: s, variant: 'outline' };
}

function getDataDecisao(s: any): string | null {
  switch (s.status) {
    case 'aprovado_lider':
    case 'rejeitado_lider':
      return s.data_aprovacao_lider || null;
    case 'aprovado_rh':
      return s.data_aprovacao_rh_gerente || s.data_aprovacao_rh || null;
    case 'rejeitado_rh':
      return s.data_aprovacao_rh_gerente || s.data_aprovacao_rh_analista || s.data_aprovacao_rh || null;
    case 'aprovado_financeiro':
    case 'rejeitado_financeiro':
      return s.data_aprovacao_financeiro || null;
    default:
      return null;
  }
}

function HistoricoPanel() {
  const { user } = useAuth();
  const { isAdmin, isRHAnalyst, isRHManager } = useUserRole();
  const canExport = isAdmin || isRHAnalyst || isRHManager;
  const [detalheItem, setDetalheItem] = useState<any>(null);

  const [datePreset, setDatePreset] = useState<DateRangePreset>('todo-periodo');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [filtroCC, setFiltroCC] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroRegime, setFiltroRegime] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  const handleDateChange = (preset: DateRangePreset, range?: { from: Date | undefined; to: Date | undefined }) => {
    setDatePreset(preset);
    if (preset === 'todo-periodo') { setDateRange({}); return; }
    if (range?.from && range?.to) { setDateRange({ from: range.from, to: range.to }); return; }
    const today = new Date();
    const r = (() => {
      switch (preset) {
        case 'hoje': return { from: today, to: today };
        case 'esta-semana': return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) };
        case 'este-mes': return { from: startOfMonth(today), to: endOfMonth(today) };
        case 'este-ano': return { from: startOfYear(today), to: endOfYear(today) };
        case 'ultimos-30-dias': return { from: subDays(today, 30), to: today };
        case 'ultimos-12-meses': return { from: subMonths(today, 12), to: today };
        default: return { from: undefined as any, to: undefined as any };
      }
    })();
    setDateRange(r);
  };

  const { data: centrosCusto = [] } = useQuery({
    queryKey: ['centros-custo-filter'],
    queryFn: async () => {
      const { data } = await supabase.from('centros_custo').select('id, codigo, descricao').eq('status', 'ativo').order('codigo');
      return data || [];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['historico-prestador', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes_prestador' as any)
        .select('*, fornecedor:fornecedores(razao_social, nome_fantasia, cnpj_cpf, cidade, uf)')
        .in('status', [
          'aprovado_lider',
          'aprovado_rh',
          'aprovado_financeiro',
          'rejeitado_lider',
          'rejeitado_rh',
          'rejeitado_financeiro',
        ])
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return enrichSolicitacoes((data as any[]) || []);
    },
  });

  const itemsFiltrados = filtrarSolicitacoes(items, dateRange, filtroCC, filtroTipo, filtroRegime)
    .filter((s: any) => filtroStatus === 'todos' ? true : s.status === filtroStatus);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Histórico (aprovadas / rejeitadas)</CardTitle></CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div>
            <Label className="text-xs block mb-1">Período</Label>
            <DateRangeFilter value={datePreset} onChange={handleDateChange} customRange={{ from: dateRange.from, to: dateRange.to }} />
          </div>
          <div>
            <Label className="text-xs">Centro de custo</Label>
            <Select value={filtroCC} onValueChange={setFiltroCC}>
              <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {centrosCusto.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="nf_mensal">NF</SelectItem>
                <SelectItem value="reembolso">Reembolso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Regime</Label>
            <Select value={filtroRegime} onValueChange={setFiltroRegime}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="prestador">Prestador de serviço</SelectItem>
                <SelectItem value="funcionario">Funcionário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aprovado_lider">Aprovado Líder</SelectItem>
                <SelectItem value="aprovado_rh">Aprovado RH</SelectItem>
                <SelectItem value="aprovado_financeiro">Aprovado Financeiro</SelectItem>
                <SelectItem value="rejeitado_lider">Rejeitado Líder</SelectItem>
                <SelectItem value="rejeitado_rh">Rejeitado RH</SelectItem>
                <SelectItem value="rejeitado_financeiro">Rejeitado Financeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {canExport && (
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportSolicitacoesToExcel(itemsFiltrados, centrosCusto, `historico-prestadores-${format(new Date(), 'yyyy-MM-dd')}`)}
                disabled={itemsFiltrados.length === 0}
              >
                <Download className="h-4 w-4 mr-1" /> Exportar Excel
              </Button>
            </div>
          )}
        </div>

        {itemsFiltrados.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum histórico.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data solicitação</TableHead>
                <TableHead>Data decisão</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>CC</TableHead>
                <TableHead>Regime</TableHead>
                <TableHead>Mês ref.</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Anexo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsFiltrados.map((s: any) => {
                const st = statusLabel(s.status);
                const dataDecisao = getDataDecisao(s);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">{format(new Date(s.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell className="text-xs">{dataDecisao ? format(new Date(dataDecisao), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</TableCell>
                    <TableCell><Badge variant="outline">{s.tipo === 'nf_mensal' ? 'NF' : 'Reembolso'}</Badge></TableCell>
                    <TableCell className="text-sm">{s.fornecedor?.nome_fantasia || s.fornecedor?.razao_social}</TableCell>
                    <TableCell className="text-xs">{(() => { const cc = centrosCusto.find((c: any) => c.id === s._centro_custo); return cc ? `${cc.codigo} - ${cc.descricao}` : '—'; })()}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="secondary">{s._regime === 'funcionario' ? 'Funcionário' : 'Prestador'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{String(s.mes_referencia).padStart(2,'0')}/{s.ano_referencia}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{s.descricao}</TableCell>
                    <TableCell className="text-right text-sm">R$ {Number(s.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openStorageFile(s.arquivo_path, 'prestador-docs')}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setDetalheItem(s)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <DetalheSolicitacaoDialog item={detalheItem} onClose={() => setDetalheItem(null)} />
      </CardContent>
    </Card>
  );
}

function DetalheSolicitacaoDialog({ item, onClose }: { item: any; onClose: () => void }) {
  const { data: detalhes } = useQuery({
    queryKey: ['detalhe-solicitacao', item?.id],
    enabled: !!item,
    queryFn: async () => {
      const [{ data: solicitante }, { data: fornecedor }] = await Promise.all([
        supabase.from('profiles').select('id, nome, email, grupo_id').eq('id', item.solicitante_id).maybeSingle(),
        supabase.from('fornecedores').select('razao_social, nome_fantasia, cnpj_cpf, email, telefone').eq('id', item.fornecedor_id).maybeSingle(),
      ]);
      let grupo: any = null;
      let lider: any = null;
      let solicitanteEhLider = false;
      if (solicitante?.grupo_id) {
        const { data: g } = await supabase.from('grupos_area').select('id, nome, lider_user_id').eq('id', solicitante.grupo_id).maybeSingle();
        grupo = g;
        if (g?.lider_user_id) {
          const { data: l } = await supabase.from('profiles').select('id, nome, email').eq('id', g.lider_user_id).maybeSingle();
          lider = l;
          if (g.lider_user_id === solicitante.id) solicitanteEhLider = true;
        }
      }
      // Verificação adicional: o solicitante é líder de algum grupo?
      const { data: lideraGrupos } = await supabase
        .from('grupos_area')
        .select('id, nome')
        .eq('lider_user_id', item.solicitante_id);
      if ((lideraGrupos || []).length > 0) solicitanteEhLider = true;

      return { solicitante, fornecedor, grupo, lider, solicitanteEhLider, lideraGrupos: lideraGrupos || [] };
    },
  });

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes da solicitação
            {detalhes?.solicitanteEhLider && (
              <Badge variant="default" className="gap-1"><Crown className="h-3 w-3" /> Líder</Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        {!item ? null : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="font-medium">{item.tipo === 'nf_mensal' ? 'Nota Fiscal' : 'Reembolso'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mês referência</p>
                <p className="font-medium">{String(item.mes_referencia).padStart(2,'0')}/{item.ano_referencia}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor</p>
                <p className="font-medium">R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data envio</p>
                <p className="font-medium">{format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
              </div>
              {item.numero_nf && (
                <div>
                  <p className="text-xs text-muted-foreground">Nº NF</p>
                  <p className="font-medium">{item.numero_nf}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Descrição</p>
              <p className="bg-muted/50 rounded p-2 whitespace-pre-wrap">{item.descricao || '—'}</p>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground uppercase mb-2">Solicitante</p>
              <p className="font-medium flex items-center gap-2">
                {detalhes?.solicitante?.nome || '—'}
                {detalhes?.solicitanteEhLider && (
                  <Badge variant="secondary" className="gap-1"><Crown className="h-3 w-3" /> É líder de área</Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{detalhes?.solicitante?.email}</p>
              <p className="text-xs mt-1">Grupo: <span className="font-medium">{detalhes?.grupo?.nome || '—'}</span></p>
              <p className="text-xs">
                Líder do solicitante:{' '}
                <span className="font-medium">
                  {detalhes?.solicitanteEhLider && !detalhes?.lider
                    ? 'O próprio solicitante'
                    : detalhes?.lider?.nome || '—'}
                </span>
                {detalhes?.lider?.email && <span className="text-muted-foreground"> ({detalhes.lider.email})</span>}
              </p>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground uppercase mb-2">Fornecedor</p>
              <p className="font-medium">{detalhes?.fornecedor?.nome_fantasia || detalhes?.fornecedor?.razao_social || '—'}</p>
              <p className="text-xs text-muted-foreground">{detalhes?.fornecedor?.cnpj_cpf}</p>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground uppercase mb-2">Anexo</p>
              {item.arquivo_path ? (
                <Button variant="outline" size="sm" onClick={() => openStorageFile(item.arquivo_path, 'prestador-docs')}>
                  <ExternalLink className="h-4 w-4 mr-2" /> Abrir anexo
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum anexo.</p>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
