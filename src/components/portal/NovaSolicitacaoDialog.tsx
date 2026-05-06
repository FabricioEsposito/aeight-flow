import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { FileUpload } from '@/components/ui/file-upload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: 'nf_mensal' | 'reembolso';
}

const meses = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

export function NovaSolicitacaoDialog({ open, onOpenChange, tipo }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [valor, setValor] = useState(0);
  const [descricao, setDescricao] = useState('');
  const [arquivoPath, setArquivoPath] = useState<string | null>(null);
  const [numeroNF, setNumeroNF] = useState('');
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    // Find vinculo aprovado for this user
    (async () => {
      const { data: vinculo } = await supabase
        .from('vinculos_usuario_fornecedor' as any)
        .select('fornecedor_id')
        .eq('user_id', user.id)
        .eq('status', 'aprovado')
        .maybeSingle();
      let forn = (vinculo as any)?.fornecedor_id || null;
      if (!forn) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('fornecedor_id')
          .eq('id', user.id)
          .maybeSingle();
        forn = (prof as any)?.fornecedor_id || null;
      }
      setFornecedorId(forn);
    })();
    setValor(0);
    setDescricao('');
    setArquivoPath(null);
    setNumeroNF('');
  }, [open, user]);

  const handleSubmit = async () => {
    try {
      const schema = z.object({
        valor: z.number().positive('Valor deve ser maior que zero'),
        descricao: z.string().trim().min(3, 'Descrição obrigatória').max(500),
        arquivo: z.string().nonempty('Arquivo obrigatório'),
      });
      schema.parse({ valor, descricao, arquivo: arquivoPath || '' });

      if (!fornecedorId) {
        toast({ title: 'Cadastro pendente', description: 'Seu vínculo com fornecedor ainda não foi aprovado.', variant: 'destructive' });
        return;
      }
      if (tipo === 'nf_mensal' && !numeroNF.trim()) {
        toast({ title: 'Número da NF obrigatório', variant: 'destructive' });
        return;
      }

      setSubmitting(true);
      const { error } = await supabase.from('solicitacoes_prestador' as any).insert({
        solicitante_id: user!.id,
        fornecedor_id: fornecedorId,
        tipo,
        valor,
        descricao,
        mes_referencia: mes,
        ano_referencia: ano,
        numero_nf: tipo === 'nf_mensal' ? numeroNF : null,
        arquivo_path: arquivoPath,
        status: 'pendente_rh',
      });
      if (error) throw error;

      toast({ title: 'Enviado!', description: 'Sua solicitação foi enviada para aprovação do RH.' });
      queryClient.invalidateQueries({ queryKey: ['portal-solicitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['portal-list'] });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || String(e), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{tipo === 'nf_mensal' ? 'Enviar Nota Fiscal Mensal' : 'Solicitar Reembolso'}</DialogTitle>
          <DialogDescription>Preencha os dados e anexe o documento.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mês de referência</Label>
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{meses.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano</Label>
              <Input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
            </div>
          </div>
          {tipo === 'nf_mensal' && (
            <div>
              <Label>Número da NF</Label>
              <Input value={numeroNF} onChange={(e) => setNumeroNF(e.target.value)} placeholder="Ex: 12345" />
            </div>
          )}
          <div>
            <Label>Valor</Label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva brevemente..." rows={3} maxLength={500} />
          </div>
          <div>
            <Label>Arquivo (PDF)</Label>
            <FileUpload
              bucket="prestador-docs"
              path={`${user?.id}/${tipo}-${Date.now()}.pdf`}
              value={arquivoPath}
              onChange={setArquivoPath}
              accept="application/pdf"
              maxSizeMB={10}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
