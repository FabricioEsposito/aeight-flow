import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Upload, Download, Trash2, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/table-pagination';
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
  conta_bancaria?: { banco: string; descricao: string } | null;
}

const ACCEPTED_TYPES = '.pdf,.xls,.xlsx,.csv,.ofx';
const BUCKET = 'contador-docs';

const meses = [
  { value: '1', label: 'Janeiro' }, { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' }, { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' }, { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' }, { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' }, { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
];

export default function DocumentosTab() {
  const { user } = useAuth();
  const { isAdmin, isFinanceManager, isFinanceAnalyst } = useUserRole();
  const { toast } = useToast();

  const canUpload = isAdmin || isFinanceManager || isFinanceAnalyst;
  const canDelete = isAdmin || isFinanceManager;

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterConta, setFilterConta] = useState('all');
  const [filterAno, setFilterAno] = useState(String(new Date().getFullYear()));
  const [filterMes, setFilterMes] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Upload dialog state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadConta, setUploadConta] = useState('');
  const [uploadMes, setUploadMes] = useState(String(new Date().getMonth() + 1));
  const [uploadAno, setUploadAno] = useState(String(new Date().getFullYear()));
  const [uploadDescricao, setUploadDescricao] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: docs }, { data: contas }] = await Promise.all([
        supabase
          .from('contador_documentos')
          .select('*, conta_bancaria:conta_bancaria_id(banco, descricao)')
          .order('created_at', { ascending: false }),
        supabase.from('contas_bancarias').select('id, banco, descricao, status').eq('status', 'ativo').order('descricao'),
      ]);
      setDocumentos((docs as any) || []);
      setContasBancarias(contas || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = documentos.filter(d => {
    if (searchTerm && !d.nome_arquivo.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(d.descricao || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterConta !== 'all' && d.conta_bancaria_id !== filterConta) return false;
    if (filterAno !== 'all' && d.ano_referencia !== Number(filterAno)) return false;
    if (filterMes !== 'all' && d.mes_referencia !== Number(filterMes)) return false;
    return true;
  });

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleUpload = async () => {
    if (!uploadFile || !uploadConta) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = uploadFile.name.split('.').pop();
      const storagePath = `${uploadAno}/${uploadMes}/${uploadConta}/${Date.now()}.${ext}`;

      const { error: storageErr } = await supabase.storage.from(BUCKET).upload(storagePath, uploadFile);
      if (storageErr) throw storageErr;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

      const { error: dbErr } = await supabase.from('contador_documentos').insert({
        nome_arquivo: uploadFile.name,
        storage_path: urlData.publicUrl,
        conta_bancaria_id: uploadConta,
        mes_referencia: Number(uploadMes),
        ano_referencia: Number(uploadAno),
        descricao: uploadDescricao || null,
        uploaded_by: user?.id || '',
      });
      if (dbErr) throw dbErr;

      toast({ title: 'Documento enviado com sucesso!' });
      setShowUpload(false);
      resetUploadForm();
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao enviar documento', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: Documento) => {
    if (!confirm(`Excluir "${doc.nome_arquivo}"?`)) return;
    try {
      // Extract path from URL for storage deletion
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

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadConta('');
    setUploadMes(String(new Date().getMonth() + 1));
    setUploadAno(String(new Date().getFullYear()));
    setUploadDescricao('');
  };

  const getMonthLabel = (m: number) => meses.find(x => x.value === String(m))?.label || '';

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Nome do arquivo..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9"
              />
            </div>
          </div>

          <div className="w-[200px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Conta Bancária</Label>
            <Select value={filterConta} onValueChange={v => { setFilterConta(v); setCurrentPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {contasBancarias.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.banco} - {c.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[140px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Ano</Label>
            <Select value={filterAno} onValueChange={v => { setFilterAno(v); setCurrentPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[160px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Mês</Label>
            <Select value={filterMes} onValueChange={v => { setFilterMes(v); setCurrentPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {meses.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {canUpload && (
            <Button onClick={() => setShowUpload(true)} className="gap-2">
              <Upload className="w-4 h-4" /> Enviar Documento
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arquivo</TableHead>
              <TableHead>Conta Bancária</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Data Upload</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : paginated.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum documento encontrado</TableCell></TableRow>
            ) : paginated.map(doc => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{doc.nome_arquivo}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {doc.conta_bancaria ? `${(doc.conta_bancaria as any).banco} - ${(doc.conta_bancaria as any).descricao}` : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{getMonthLabel(doc.mes_referencia)}/{doc.ano_referencia}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{doc.descricao || '-'}</TableCell>
                <TableCell className="text-sm">{format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Download">
                      <Download className="w-4 h-4" />
                    </Button>
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} title="Excluir" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length > itemsPerPage && (
          <div className="p-4 border-t">
            <TablePagination
              currentPage={currentPage}
              totalItems={filtered.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={v => { setItemsPerPage(v); setCurrentPage(1); }}
            />
          </div>
        )}
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Arquivo *</Label>
              <Input type="file" accept={ACCEPTED_TYPES} onChange={e => setUploadFile(e.target.files?.[0] || null)} />
              <p className="text-xs text-muted-foreground mt-1">PDF, XLS, XLSX, CSV, OFX</p>
            </div>
            <div>
              <Label>Conta Bancária *</Label>
              <Select value={uploadConta} onValueChange={setUploadConta}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {contasBancarias.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.banco} - {c.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mês *</Label>
                <Select value={uploadMes} onValueChange={setUploadMes}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {meses.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ano *</Label>
                <Select value={uploadAno} onValueChange={setUploadAno}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea value={uploadDescricao} onChange={e => setUploadDescricao(e.target.value)} placeholder="Ex: Extrato Itaú março 2025" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
