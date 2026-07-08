import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CompanyTag } from '@/components/centro-custos/CompanyBadge';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

interface ContratoRH {
  id: string;
  numero_contrato: string;
  data_inicio: string;
  data_fim: string | null;
  valor_total: number;
  valor_bruto: number | null;
  status: string;
  recorrente: boolean | null;
  periodo_recorrencia: string | null;
  is_folha_funcionario: boolean | null;
  is_beneficio_funcionario: boolean | null;
  fornecedores?: { razao_social: string; nome_fantasia: string | null } | null;
  centros_custo_multi?: { codigo: string; descricao: string; percentual: number }[];
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

export function ContratosRHTab() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contratos, setContratos] = useState<ContratoRH[]>([]);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'todos' | 'folha' | 'beneficio'>('todos');

  useEffect(() => {
    fetchContratos();
  }, []);

  const fetchContratos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select(`
          id, numero_contrato, data_inicio, data_fim, valor_total, valor_bruto,
          status, recorrente, periodo_recorrencia,
          is_folha_funcionario, is_beneficio_funcionario,
          fornecedores:fornecedor_id(razao_social, nome_fantasia)
        `)
        .or('is_folha_funcionario.eq.true,is_beneficio_funcionario.eq.true')
        .order('data_inicio', { ascending: false });

      if (error) throw error;

      const ids = (data || []).map((c: any) => c.id);
      const { data: ccData } = await supabase
        .from('contratos_centros_custo')
        .select('contrato_id, percentual, centros_custo:centro_custo_id(codigo, descricao)')
        .in('contrato_id', ids);

      const ccMap = new Map<string, { codigo: string; descricao: string; percentual: number }[]>();
      (ccData || []).forEach((row: any) => {
        const info = row.centros_custo;
        if (!info) return;
        const arr = ccMap.get(row.contrato_id) || [];
        arr.push({ codigo: info.codigo, descricao: info.descricao, percentual: row.percentual });
        ccMap.set(row.contrato_id, arr);
      });

      const list: ContratoRH[] = (data || []).map((c: any) => ({
        ...c,
        centros_custo_multi: ccMap.get(c.id) || [],
      }));

      setContratos(list);
    } catch (e) {
      console.error('Erro ao carregar contratos RH:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return contratos.filter(c => {
      if (tipoFilter === 'folha' && !c.is_folha_funcionario) return false;
      if (tipoFilter === 'beneficio' && !c.is_beneficio_funcionario) return false;
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      const nome = (c.fornecedores?.nome_fantasia || c.fornecedores?.razao_social || '').toLowerCase();
      return nome.includes(term) || c.numero_contrato.toLowerCase().includes(term);
    });
  }, [contratos, search, tipoFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por fornecedor ou número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={tipoFilter === 'todos' ? 'default' : 'outline'} onClick={() => setTipoFilter('todos')}>Todos</Button>
          <Button size="sm" variant={tipoFilter === 'folha' ? 'default' : 'outline'} onClick={() => setTipoFilter('folha')}>Folha</Button>
          <Button size="sm" variant={tipoFilter === 'beneficio' ? 'default' : 'outline'} onClick={() => setTipoFilter('beneficio')}>Benefícios</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Nenhum contrato encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Centros de Custo</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead className="text-right">Valor Bruto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.numero_contrato}</TableCell>
                    <TableCell>{c.fornecedores?.nome_fantasia || c.fornecedores?.razao_social || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.is_folha_funcionario && <Badge variant="secondary" className="text-xs">Folha</Badge>}
                        {c.is_beneficio_funcionario && <Badge variant="outline" className="text-xs">Benefício</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(c.centros_custo_multi || []).map((cc, i) => (
                          <CompanyTag key={i} codigo={cc.codigo} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.data_inicio ? format(parseISO(c.data_inicio + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.data_fim ? format(parseISO(c.data_fim + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(c.valor_bruto ?? c.valor_total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'ativo' ? 'default' : 'secondary'} className="text-xs">
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => navigate(`/contratos/${c.id}/visualizar`)}
                        title="Visualizar contrato"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
