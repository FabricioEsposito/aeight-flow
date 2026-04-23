import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckCircle2, X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import type { TransacaoComMatches } from '@/lib/conciliacao-matcher';

interface Props {
  items: TransacaoComMatches[];
  selectedIds: Set<number>;
  onToggleSelect: (index: number, checked: boolean) => void;
  onChangeCandidate: (index: number, candidateId: string) => void;
  onIgnore: (index: number) => void;
  onCreateLancamento: (index: number) => void;
  onToggleSelectAll: (group: 'match' | 'sugerido', checked: boolean) => void;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (d: string) => {
  if (!d) return '-';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

export function ConciliacaoMatchingTable({
  items,
  selectedIds,
  onToggleSelect,
  onChangeCandidate,
  onIgnore,
  onCreateLancamento,
  onToggleSelectAll,
}: Props) {
  const grupoMatch = items.filter(i => i.classification === 'match' && !i.ignored);
  const grupoSugerido = items.filter(i => i.classification === 'sugerido' && !i.ignored);
  const grupoSem = items.filter(i => i.classification === 'sem-match' || i.ignored);

  const renderTipoBadge = (t: 'entrada' | 'saida') =>
    t === 'entrada' ? (
      <Badge variant="outline" className="gap-1 text-success border-success/30">
        <ArrowDownCircle className="w-3 h-3" /> Entrada
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
        <ArrowUpCircle className="w-3 h-3" /> Saída
      </Badge>
    );

  const renderRow = (item: TransacaoComMatches, showCheckbox: boolean) => {
    const selected = selectedIds.has(item.index);
    const candidate = item.matches.find(m => m.candidate.id === item.selectedCandidateId)?.candidate;

    return (
      <TableRow key={item.index} className={item.ignored ? 'opacity-50' : ''}>
        <TableCell>
          {showCheckbox && (
            <Checkbox
              checked={selected}
              onCheckedChange={(c) => onToggleSelect(item.index, c === true)}
              disabled={!item.selectedCandidateId || !!item.ignored}
            />
          )}
        </TableCell>
        <TableCell className="text-sm">{formatDate(item.transacao.data_movimento)}</TableCell>
        <TableCell>{renderTipoBadge(item.transacao.tipo)}</TableCell>
        <TableCell className="font-medium">{formatCurrency(item.transacao.valor)}</TableCell>
        <TableCell className="max-w-xs truncate text-sm" title={item.transacao.descricao}>
          {item.transacao.descricao || '-'}
        </TableCell>
        <TableCell>
          {item.classification === 'sem-match' ? (
            item.createdLancamentoId ? (
              <Badge variant="outline" className="gap-1 text-success border-success/30">
                <CheckCircle2 className="w-3 h-3" /> Lançamento criado
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">Sem candidato</span>
            )
          ) : item.matches.length === 1 || item.classification === 'match' ? (
            candidate ? (
              <div className="text-sm">
                <div className="font-medium">{candidate.cliente_fornecedor_nome || '-'}</div>
                <div className="text-xs text-muted-foreground truncate max-w-xs">
                  {candidate.numero_contrato ? `Contrato ${candidate.numero_contrato} • ` : ''}
                  Venc. {formatDate(candidate.data_vencimento)} • {formatCurrency(candidate.valor)}
                </div>
              </div>
            ) : null
          ) : (
            <Select
              value={item.selectedCandidateId || ''}
              onValueChange={(v) => onChangeCandidate(item.index, v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Escolher parcela..." />
              </SelectTrigger>
              <SelectContent>
                {item.matches.map(m => (
                  <SelectItem key={m.candidate.id} value={m.candidate.id}>
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{m.candidate.cliente_fornecedor_nome || '-'}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.candidate.numero_contrato ? `${m.candidate.numero_contrato} • ` : ''}
                        Venc. {formatDate(m.candidate.data_vencimento)} • {formatCurrency(m.candidate.valor)} • Score {m.score}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </TableCell>
        <TableCell className="text-right">
          {item.classification === 'sem-match' && !item.createdLancamentoId && !item.ignored && (
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => onCreateLancamento(item.index)}>
                <Plus className="w-3 h-3 mr-1" /> Criar lançamento
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onIgnore(item.index)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      {grupoMatch.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Match único — pré-selecionados ({grupoMatch.length})
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={grupoMatch.every(i => selectedIds.has(i.index))}
                onCheckedChange={(c) => onToggleSelectAll('match', c === true)}
              />
              <span className="text-muted-foreground">Selecionar todos</span>
            </div>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Descrição (Banco)</TableHead>
                  <TableHead>Parcela sugerida</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{grupoMatch.map(item => renderRow(item, true))}</TableBody>
            </Table>
          </div>
        </div>
      )}

      {grupoSugerido.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-sm">
              Múltiplos candidatos — escolha qual bater ({grupoSugerido.length})
            </h3>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Descrição (Banco)</TableHead>
                  <TableHead>Escolher parcela</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{grupoSugerido.map(item => renderRow(item, true))}</TableBody>
            </Table>
          </div>
        </div>
      )}

      {grupoSem.length > 0 && (
        <div>
          <h3 className="font-medium text-sm mb-2">Sem match ({grupoSem.length})</h3>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Descrição (Banco)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{grupoSem.map(item => renderRow(item, false))}</TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
