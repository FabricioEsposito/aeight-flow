import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Upload, Download, Trash2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangeFilter, DateRangePreset } from '@/components/financeiro/DateRangeFilter';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { openStorageFile } from '@/lib/storage-utils';

interface Documento {
  id: string;
  nome_arquivo: string;
  storage_path: string;
  conta_bancaria_id: string | null;
  mes_referencia: number;
  ano_referencia: number;
  descricao: string | null;
  uploaded_by: string;
  created_at: string;
}

interface ContaBancaria {
  id: string;
  banco: string;
  descricao: string;
}

const ACCEPTED_TYPES = '.pdf,.xls,.xlsx,.csv,.ofx';
const BUCKET = 'contador-docs';

export default function DocumentosTab() {
  const { user } = useAuth();
  const { isAdmin, isFinanceManager, isFinanceAnalyst } = useUserRole();
  const { toast } = useToast();

  const canUpload = isAdmin || isFinanceManager || isFinanceAnalyst;
  const canDelete = isAdmin || isFinanceManager;

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Date filter - default to current month
  const [datePreset, setDatePreset] = useState<DateRangePreset>('este-mes');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleDateChange = useCallback((preset: DateRangePreset, range?: { from: Date | undefined; to: Date | undefined }) => {
    setDatePreset(preset);
    const today = new Date();
    if (preset === 'todo-periodo') {
      setDateRange({ from: new Date(2020, 0, 1), to: today });
    } else if (preset === 'este-mes') {
      setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
    } else if (preset === 'este-ano') {
      setDateRange({ from: new Date(today.getFullYear(), 0, 1), to: new Date(today.getFullYear(), 11, 31) });
    } else if (range?.from && range?.to) {
      setDateRange({ from: range.from, to: range.to });
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: docs }, { data: contas }] = await Promise.all([
        supabase
          .from('contador_documentos')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('contas_bancarias').select('id, banco, descricao, status').eq('status', 'ativo').order('descricao'),
      ]);
      setDocumentos((docs as any) || []);
      setContasBancarias((contas || []) as ContaBancaria[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Generate month slots within the selected date range
  const monthSlots = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];
    const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
    return months.map(d => ({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: format(d, 'MMMM/yyyy', { locale: ptBR }),
    }));
  }, [dateRange]);

  // Build grid rows: one per bank account × month
  const gridRows = useMemo(() => {
    const rows: Array<{
      key: string;
      conta: ContaBancaria;
      month: number;
      year: number;
      monthLabel: string;
      docs: Documento[];
    }> = [];

    for (const conta of contasBancarias) {
      for (const slot of monthSlots) {
        const docs = documentos.filter(d =>
          d.conta_bancaria_id === conta.id &&
          d.mes_referencia === slot.month &&
          d.ano_referencia === slot.year
        );
        rows.push({
          key: `${conta.id}-${slot.year}-${slot.month}`,
          conta,
          month: slot.month,
          year: slot.year,
          monthLabel: slot.label,
          docs,
        });
      }
    }
    return rows;
  }, [contasBancarias, monthSlots, documentos]);

  const handleFileUpload = async (contaId: string, month: number, year: number, file: File) => {
    const key = `${contaId}-${year}-${month}`;
    setUploadingKey(key);
    try {
      const ext = file.name.split('.').pop();
      const storagePath = `${year}/${month}/${contaId}/${Date.now()}.${ext}`;

      const { error: storageErr } = await supabase.storage.from(BUCKET).upload(storagePath, file);
      if (storageErr) throw storageErr;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

      const { error: dbErr } = await supabase.from('contador_documentos').insert({
        nome_arquivo: file.name,
        storage_path: urlData.publicUrl,
        conta_bancaria_id: contaId,
        mes_referencia: month,
        ano_referencia: year,
        uploaded_by: user?.id || '',
      });
      if (dbErr) throw dbErr;

      toast({ title: 'Documento enviado com sucesso!' });
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingKey(null);
      // Reset file input
      const inputRef = fileInputRefs.current[key];
      if (inputRef) inputRef.value = '';
    }
  };

  const handleDelete = async (doc: Documento) => {
    if (!confirm(`Excluir "${doc.nome_arquivo}"?`)) return;
    try {
      const pathMatch = doc.storage_path.match(/contador-docs\/(.+?)(\?|$)/);
      if (pathMatch?.[1]) {
        await supabase.storage.from(BUCKET).remove([decodeURIComponent(pathMatch[1])]);
      }
      const { error } = await supabase.from('contador_documentos').delete().eq('id', doc.id);
      if (error) throw error;
      toast({ title: 'Documento excluído' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    }
  };

  const handleDownload = (doc: Documento) => {
    openStorageFile(doc.storage_path, BUCKET);
  };

  // Stats
  const totalSlots = gridRows.length;
  const filledSlots = gridRows.filter(r => r.docs.length > 0).length;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Período:</span>
            <DateRangeFilter
              value={datePreset}
              onChange={handleDateChange}
              customRange={dateRange}
            />
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant={filledSlots === totalSlots ? 'default' : 'secondary'} className="gap-1">
              {filledSlots === totalSlots ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              {filledSlots}/{totalSlots} extratos enviados
            </Badge>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conta Bancária</TableHead>
              <TableHead>Mês/Ano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Documentos</TableHead>
              {canUpload && <TableHead>Enviar</TableHead>}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={canUpload ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : gridRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canUpload ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  Nenhuma conta bancária encontrada para o período
                </TableCell>
              </TableRow>
            ) : gridRows.map(row => (
              <TableRow key={row.key} className={row.docs.length === 0 ? 'bg-muted/30' : ''}>
                <TableCell>
                  <span className="font-medium text-sm">{row.conta.banco} - {row.conta.descricao}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm capitalize">{row.monthLabel}</span>
                </TableCell>
                <TableCell>
                  {row.docs.length > 0 ? (
                    <Badge variant="default" className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle2 className="w-3 h-3" />
                      Enviado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <AlertCircle className="w-3 h-3" />
                      Pendente
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {row.docs.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {row.docs.map(doc => (
                        <div key={doc.id} className="flex items-center gap-2 text-sm">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{doc.nome_arquivo}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(doc.created_at), 'dd/MM HH:mm')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                {canUpload && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept={ACCEPTED_TYPES}
                        className="hidden"
                        ref={el => { fileInputRefs.current[row.key] = el; }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(row.conta.id, row.month, row.year, file);
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={uploadingKey === row.key}
                        onClick={() => fileInputRefs.current[row.key]?.click()}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {uploadingKey === row.key ? 'Enviando...' : 'Upload'}
                      </Button>
                    </div>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {row.docs.map(doc => (
                      <React.Fragment key={doc.id}>
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title={`Download ${doc.nome_arquivo}`}>
                          <Download className="w-4 h-4" />
                        </Button>
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} title="Excluir" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
