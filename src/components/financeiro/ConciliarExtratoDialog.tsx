import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ContaBancariaSelect } from '@/components/financeiro/ContaBancariaSelect';
import { Loader2, Upload, AlertCircle, CheckCircle2, ArrowLeft, FileWarning, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { parseExtratoFile, type OfxTransaction, type ParsedExtrato } from '@/lib/ofx-parser';
import { matchTransacoes, type CandidateLancamento, type TransacaoComMatches } from '@/lib/conciliacao-matcher';
import { ConciliacaoMatchingTable } from './ConciliacaoMatchingTable';
import { NovoLancamentoDialog, type PrefilledLancamentoData } from './NovoLancamentoDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'preview' | 'review' | 'processing';

export function ConciliarExtratoDialog({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [contaBancariaId, setContaBancariaId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [parsed, setParsed] = useState<ParsedExtrato | null>(null);
  const [items, setItems] = useState<TransacaoComMatches[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [extratoImportadoId, setExtratoImportadoId] = useState<string | null>(null);
  const [parsedMeta, setParsedMeta] = useState<{ data_inicio: string | null; data_fim: string | null; nome: string } | null>(null);
  const [novoLancOpen, setNovoLancOpen] = useState(false);
  const [novoLancPrefill, setNovoLancPrefill] = useState<PrefilledLancamentoData | null>(null);
  const [pendingNovoIndex, setPendingNovoIndex] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('upload');
      setContaBancariaId('');
      setFile(null);
      setParsed(null);
      setItems([]);
      setSelectedIds(new Set());
      setExtratoImportadoId(null);
      setParsedMeta(null);
      setNovoLancOpen(false);
      setNovoLancPrefill(null);
      setPendingNovoIndex(null);
    }
  }, [open]);

  const stats = useMemo(() => {
    const matchUnico = items.filter(i => i.classification === 'match' && !i.ignored).length;
    const sugerido = items.filter(i => i.classification === 'sugerido' && !i.ignored).length;
    const semMatch = items.filter(i => i.classification === 'sem-match' || i.ignored).length;
    return { total: items.length, matchUnico, sugerido, semMatch };
  }, [items]);

  const handlePreviewFile = async () => {
    if (!contaBancariaId || !file) {
      toast({ title: 'Preencha todos os campos', description: 'Selecione a conta bancária e o arquivo.', variant: 'destructive' });
      return;
    }
    setPreviewing(true);
    try {
      const result = await parseExtratoFile(file);
      setParsed(result);
      setStep('preview');
    } catch (e: any) {
      console.error('Erro ao ler arquivo:', e);
      toast({ title: 'Erro ao ler arquivo', description: e.message, variant: 'destructive' });
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsed || !file) return;
    if (parsed.transacoes.length === 0) {
      toast({ title: 'Nenhuma transação válida', description: 'Corrija o arquivo e tente novamente.', variant: 'destructive' });
      return;
    }
    setParsing(true);
    try {
      // Buscar candidatos pendentes/vencidos no range das datas ±15 dias
      const datas = parsed.transacoes.map(t => t.data_movimento).sort();
      const dataMin = new Date(datas[0] + 'T00:00:00');
      dataMin.setDate(dataMin.getDate() - 15);
      const dataMax = new Date(datas[datas.length - 1] + 'T00:00:00');
      dataMax.setDate(dataMax.getDate() + 15);

      const [receberRes, pagarRes] = await Promise.all([
        supabase
          .from('contas_receber')
          .select('id, valor, data_vencimento, descricao, parcela_id, cliente_id, clientes:cliente_id(razao_social, nome_fantasia, cnpj_cpf), parcelas_contrato:parcela_id(contratos(numero_contrato))')
          .eq('conta_bancaria_id', contaBancariaId)
          .in('status', ['pendente', 'vencido']),
        supabase
          .from('contas_pagar')
          .select('id, valor, data_vencimento, descricao, parcela_id, fornecedor_id, fornecedores:fornecedor_id(razao_social, nome_fantasia, cnpj_cpf), parcelas_contrato:parcela_id(contratos(numero_contrato))')
          .eq('conta_bancaria_id', contaBancariaId)
          .in('status', ['pendente', 'vencido']),
      ]);

      const candidates: CandidateLancamento[] = [];
      for (const r of (receberRes.data || [])) {
        const cli: any = r.clientes;
        const parc: any = r.parcelas_contrato;
        candidates.push({
          id: r.id,
          origem: 'receber',
          valor: Number(r.valor),
          data_vencimento: r.data_vencimento,
          descricao: r.descricao || '',
          cliente_fornecedor_nome: cli?.nome_fantasia || cli?.razao_social,
          cliente_fornecedor_doc: cli?.cnpj_cpf,
          parcela_id: r.parcela_id,
          numero_contrato: parc?.contratos?.numero_contrato,
        });
      }
      for (const p of (pagarRes.data || [])) {
        const forn: any = p.fornecedores;
        const parc: any = p.parcelas_contrato;
        candidates.push({
          id: p.id,
          origem: 'pagar',
          valor: Number(p.valor),
          data_vencimento: p.data_vencimento,
          descricao: p.descricao || '',
          cliente_fornecedor_nome: forn?.nome_fantasia || forn?.razao_social,
          cliente_fornecedor_doc: forn?.cnpj_cpf,
          parcela_id: p.parcela_id,
          numero_contrato: parc?.contratos?.numero_contrato,
        });
      }

      const matched = matchTransacoes(parsed.transacoes, candidates);

      // Criar registro de extrato_importado
      const { data: { user } } = await supabase.auth.getUser();
      const { data: extInsert, error: extErr } = await supabase
        .from('extratos_importados')
        .insert({
          conta_bancaria_id: contaBancariaId,
          nome_arquivo: file.name,
          data_inicio: parsed.data_inicio,
          data_fim: parsed.data_fim,
          total_transacoes: parsed.transacoes.length,
          total_conciliadas: 0,
          created_by: user?.id,
        })
        .select('id')
        .single();
      if (extErr) throw extErr;

      // Inserir transações
      const transRows = parsed.transacoes.map(t => ({
        extrato_importado_id: extInsert.id,
        fitid: t.fitid,
        data_movimento: t.data_movimento,
        valor: t.valor,
        tipo: t.tipo,
        descricao: t.descricao,
        status: 'pendente',
      }));
      if (transRows.length > 0) {
        await supabase.from('extrato_transacoes').insert(transRows);
      }

      setExtratoImportadoId(extInsert.id);
      setParsedMeta({ data_inicio: parsed.data_inicio, data_fim: parsed.data_fim, nome: file.name });
      setItems(matched);

      // Pré-selecionar matches únicos
      const preselected = new Set<number>();
      matched.forEach(item => {
        if (item.classification === 'match' && item.selectedCandidateId) preselected.add(item.index);
      });
      setSelectedIds(preselected);

      setStep('review');
    } catch (e: any) {
      console.error('Erro ao processar extrato:', e);
      toast({ title: 'Erro ao processar arquivo', description: e.message, variant: 'destructive' });
    } finally {
      setParsing(false);
    }
  };

  const handleToggleSelect = (index: number, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(index);
      else next.delete(index);
      return next;
    });
  };

  const handleToggleSelectAll = (group: 'match' | 'sugerido', checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      items
        .filter(i => i.classification === group && !i.ignored && i.selectedCandidateId)
        .forEach(i => {
          if (checked) next.add(i.index);
          else next.delete(i.index);
        });
      return next;
    });
  };

  const handleChangeCandidate = (index: number, candidateId: string) => {
    setItems(prev => prev.map(i => i.index === index ? { ...i, selectedCandidateId: candidateId } : i));
  };

  const handleIgnore = (index: number) => {
    setItems(prev => prev.map(i => i.index === index ? { ...i, ignored: true } : i));
  };

  const handleCreateLancamento = (index: number) => {
    const item = items[index];
    if (!item) return;
    setPendingNovoIndex(index);
    setNovoLancPrefill({
      tipo: item.transacao.tipo === 'entrada' ? 'receita' : 'despesa',
      data: item.transacao.data_movimento,
      valor: item.transacao.valor,
      descricao: item.transacao.descricao,
      conta_bancaria_id: contaBancariaId,
      lockContaBancaria: true,
      marcarPago: true,
    });
    setNovoLancOpen(true);
  };

  const handleNovoLancSaved = async () => {
    setNovoLancOpen(false);
    if (pendingNovoIndex == null) return;
    setItems(prev => prev.map(i => i.index === pendingNovoIndex
      ? { ...i, createdLancamentoId: { id: 'novo', origem: i.transacao.tipo === 'entrada' ? 'receber' : 'pagar' } }
      : i,
    ));
    setPendingNovoIndex(null);
    toast({ title: 'Lançamento criado', description: 'A transação foi conciliada com o novo lançamento.' });
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0) {
      toast({ title: 'Nenhum item selecionado', description: 'Selecione ao menos uma transação para conciliar.', variant: 'destructive' });
      return;
    }
    setConfirming(true);
    try {
      const toProcess = items.filter(i => selectedIds.has(i.index) && i.selectedCandidateId);

      const receberUpdates = toProcess.filter(i => i.transacao.tipo === 'entrada');
      const pagarUpdates = toProcess.filter(i => i.transacao.tipo === 'saida');

      await Promise.all(receberUpdates.map(item =>
        supabase
          .from('contas_receber')
          .update({
            status: 'pago',
            data_recebimento: item.transacao.data_movimento,
            conta_bancaria_id: contaBancariaId,
          })
          .eq('id', item.selectedCandidateId!),
      ));

      await Promise.all(pagarUpdates.map(item =>
        supabase
          .from('contas_pagar')
          .update({
            status: 'pago',
            data_pagamento: item.transacao.data_movimento,
            conta_bancaria_id: contaBancariaId,
          })
          .eq('id', item.selectedCandidateId!),
      ));

      const parcelasIds: string[] = [];
      const candidatesById = new Map<string, CandidateLancamento>();
      for (const i of items) {
        for (const m of i.matches) candidatesById.set(m.candidate.id, m.candidate);
      }
      for (const i of toProcess) {
        const cand = candidatesById.get(i.selectedCandidateId!);
        if (cand?.parcela_id) parcelasIds.push(cand.parcela_id);
      }
      if (parcelasIds.length > 0) {
        await supabase.from('parcelas_contrato').update({ status: 'pago' }).in('id', parcelasIds);
      }

      if (extratoImportadoId) {
        await supabase
          .from('extratos_importados')
          .update({ total_conciliadas: toProcess.length })
          .eq('id', extratoImportadoId);
      }

      toast({
        title: 'Conciliação concluída',
        description: `${toProcess.length} transação(ões) conciliada(s) com sucesso.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      console.error('Erro ao confirmar conciliação:', e);
      toast({ title: 'Erro ao conciliar', description: e.message, variant: 'destructive' });
    } finally {
      setConfirming(false);
    }
  };

  const formatBR = (ymd: string | null) => {
    if (!ymd) return '—';
    const [y, m, d] = ymd.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conciliar extrato bancário</DialogTitle>
            <DialogDescription>
              Importe o arquivo OFX/CSV/Excel do seu banco e o sistema cruzará com as parcelas pendentes.
            </DialogDescription>
          </DialogHeader>

          {step === 'upload' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Conta bancária *</Label>
                <ContaBancariaSelect
                  value={contaBancariaId}
                  onValueChange={setContaBancariaId}
                  placeholder="Selecione a conta a conciliar"
                />
              </div>
              <div className="space-y-2">
                <Label>Arquivo do extrato *</Label>
                <input
                  type="file"
                  accept=".ofx,.qfx,.csv,.xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm border border-input rounded-md p-2 bg-background file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-secondary file:text-secondary-foreground file:cursor-pointer cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: .ofx (padrão dos bancos brasileiros), .csv, .xlsx, .xls. Para planilhas use as colunas: <code>data</code>, <code>valor</code>, <code>descricao</code> (valor positivo = entrada; negativo = saída).
                </p>
                <p className="text-xs text-muted-foreground">
                  O arquivo será analisado e você poderá revisar as transações lidas antes de confirmar a importação.
                </p>
              </div>
            </div>
          )}

          {step === 'preview' && parsed && (
            <div className="space-y-4 py-4">
              {/* Cards de resumo do parsing */}
              <div className="grid grid-cols-4 gap-3">
                <div className="border rounded-md p-3">
                  <div className="text-xs text-muted-foreground">Linhas/blocos lidos</div>
                  <div className="text-2xl font-semibold">{parsed.totalLidos}</div>
                  <div className="text-xs text-muted-foreground mt-1">Formato: {parsed.formato.toUpperCase()}</div>
                </div>
                <div className="border rounded-md p-3">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-success" /> Válidas
                  </div>
                  <div className="text-2xl font-semibold text-success">{parsed.transacoes.length}</div>
                </div>
                <div className="border rounded-md p-3">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileWarning className="w-3 h-3 text-destructive" /> Com erro
                  </div>
                  <div className={`text-2xl font-semibold ${parsed.erros.length > 0 ? 'text-destructive' : ''}`}>
                    {parsed.erros.length}
                  </div>
                </div>
                <div className="border rounded-md p-3">
                  <div className="text-xs text-muted-foreground">Período detectado</div>
                  <div className="text-sm font-medium mt-1">
                    {formatBR(parsed.data_inicio)} a {formatBR(parsed.data_fim)}
                  </div>
                </div>
              </div>

              {/* Erros de parsing */}
              {parsed.erros.length > 0 && (
                <div className="border border-destructive/40 rounded-md">
                  <div className="px-3 py-2 bg-destructive/5 border-b border-destructive/40 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <span className="text-sm font-medium">
                      {parsed.erros.length} {parsed.erros.length === 1 ? 'linha foi descartada' : 'linhas foram descartadas'} durante a leitura
                    </span>
                  </div>
                  <ScrollArea className="max-h-[200px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Linha</TableHead>
                          <TableHead className="w-[300px]">Motivo</TableHead>
                          <TableHead>Conteúdo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsed.erros.map((erro, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Badge variant="outline">{erro.linha || '—'}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-destructive">{erro.motivo}</TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">{erro.raw || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}

              {/* Tabela de transações lidas */}
              <div className="border rounded-md">
                <div className="px-3 py-2 bg-muted/30 border-b flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm font-medium">Pré-visualização das transações que serão importadas</span>
                </div>
                {parsed.transacoes.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Nenhuma transação válida foi encontrada no arquivo.
                  </div>
                ) : (
                  <ScrollArea className="max-h-[320px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead className="w-28">Data</TableHead>
                          <TableHead className="w-24">Tipo</TableHead>
                          <TableHead className="w-32 text-right">Valor</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="w-32">FITID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsed.transacoes.map((t, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="text-sm">{formatBR(t.data_movimento)}</TableCell>
                            <TableCell>
                              <Badge variant={t.tipo === 'entrada' ? 'default' : 'secondary'}>
                                {t.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {t.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                            <TableCell className="text-sm truncate max-w-[400px]" title={t.descricao}>
                              {t.descricao || <span className="text-muted-foreground italic">sem descrição</span>}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[120px]" title={t.fitid || ''}>
                              {t.fitid || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="border rounded-md p-3">
                  <div className="text-xs text-muted-foreground">Total transações</div>
                  <div className="text-2xl font-semibold">{stats.total}</div>
                  {parsedMeta && (
                    <div className="text-xs text-muted-foreground mt-1 truncate" title={parsedMeta.nome}>
                      {parsedMeta.nome}
                    </div>
                  )}
                </div>
                <div className="border rounded-md p-3">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-success" /> Match único
                  </div>
                  <div className="text-2xl font-semibold text-success">{stats.matchUnico}</div>
                </div>
                <div className="border rounded-md p-3">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-warning" /> Para revisão
                  </div>
                  <div className="text-2xl font-semibold">{stats.sugerido}</div>
                </div>
                <div className="border rounded-md p-3">
                  <div className="text-xs text-muted-foreground">Sem match</div>
                  <div className="text-2xl font-semibold">{stats.semMatch}</div>
                </div>
              </div>

              <ConciliacaoMatchingTable
                items={items}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onChangeCandidate={handleChangeCandidate}
                onIgnore={handleIgnore}
                onCreateLancamento={handleCreateLancamento}
                onToggleSelectAll={handleToggleSelectAll}
              />
            </div>
          )}

          <DialogFooter>
            {step === 'upload' && (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button onClick={handlePreviewFile} disabled={!contaBancariaId || !file || previewing}>
                  {previewing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Lendo arquivo...</> : <><Eye className="w-4 h-4 mr-2" /> Pré-visualizar</>}
                </Button>
              </>
            )}
            {step === 'preview' && (
              <>
                <Button variant="outline" onClick={() => { setStep('upload'); setParsed(null); }} disabled={parsing}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={parsing || !parsed || parsed.transacoes.length === 0}
                >
                  {parsing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Importar {parsed?.transacoes.length ?? 0} transação(ões)</>
                  )}
                </Button>
              </>
            )}
            {step === 'review' && (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
                <Button onClick={handleConfirm} disabled={selectedIds.size === 0 || confirming}>
                  {confirming ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Conciliando...</> : `Confirmar ${selectedIds.size} selecionado(s)`}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NovoLancamentoDialog
        open={novoLancOpen}
        onOpenChange={(o) => {
          setNovoLancOpen(o);
          if (!o) setPendingNovoIndex(null);
        }}
        onSave={handleNovoLancSaved}
        prefilled={novoLancPrefill}
      />
    </>
  );
}
