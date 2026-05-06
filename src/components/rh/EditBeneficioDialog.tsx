import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CurrencyInput } from '@/components/ui/currency-input';
import { CentroCustoRateio, RateioItem } from '@/components/contratos/CentroCustoRateio';
import { FileUpload } from '@/components/ui/file-upload';

const tiposBeneficio = ['VR', 'VA', 'VT', 'Plano de Saude', 'Plano Odontologico', 'Seguro de Vida', 'Outros'];

interface BeneficioParcelaRecord {
  parcela_id: string;
  contrato_id: string;
  fornecedor_id: string;
  fornecedor_razao_social: string;
  valor: number;
  tipo_beneficio: string;
  centros_custo: Array<{ centro_custo_id: string; codigo: string; descricao: string; percentual: number }>;
  conta_pagar_id: string | null;
  beneficio_id: string | null;
  link_nf?: string | null;
  link_boleto?: string | null;
}

interface EditBeneficioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: BeneficioParcelaRecord | null;
  onSaved: () => void;
}

export function EditBeneficioDialog({ open, onOpenChange, record, onSaved }: EditBeneficioDialogProps) {
  const [tipoBeneficio, setTipoBeneficio] = useState('Outros');
  const [valor, setValor] = useState(0);
  const [observacoes, setObservacoes] = useState('');
  const [centroCustoRateio, setCentroCustoRateio] = useState<RateioItem[]>([]);
  const [linkNf, setLinkNf] = useState<string | null>(null);
  const [linkBoleto, setLinkBoleto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (record && open) {
      setTipoBeneficio(record.tipo_beneficio || 'Outros');
      setValor(record.valor);
      setObservacoes('');
      setLinkNf(record.link_nf || null);
      setLinkBoleto(record.link_boleto || null);
      setCentroCustoRateio(
        record.centros_custo.map(cc => ({
          centro_custo_id: cc.centro_custo_id,
          codigo: cc.codigo,
          descricao: cc.descricao,
          percentual: cc.percentual,
        }))
      );
    }
  }, [record, open]);

  const handleSave = async () => {
    if (!record) return;

    // Validate rateio
    if (centroCustoRateio.length > 0) {
      const total = centroCustoRateio.reduce((acc, item) => acc + item.percentual, 0);
      if (Math.abs(total - 100) > 0.5) {
        toast({ title: 'Erro', description: 'A soma dos percentuais de centro de custo deve ser 100%.', variant: 'destructive' });
        return;
      }
    }

    setSaving(true);
    try {
      // 1. Update parcela valor
      const { error: parcelaError } = await supabase
        .from('parcelas_contrato')
        .update({ valor })
        .eq('id', record.parcela_id);
      if (parcelaError) throw parcelaError;

      // 2. Update contas_pagar valor, link_nf, link_boleto if linked
      if (record.conta_pagar_id) {
        const { data: existingFiles } = await supabase.storage
          .from('faturamento-docs')
          .list(uploadBasePath, { limit: 1000, sortBy: { column: 'updated_at', order: 'desc' } });

        const mostRecentPathFor = (prefix: 'nf' | 'boleto', current: string | null) => {
          const file = existingFiles?.find((item) => {
            const name = item.name.toLowerCase();
            return name.startsWith(`${prefix}.`) || name.startsWith(`${prefix}-`);
          });

          if (file) {
            const { data: urlData } = supabase.storage
              .from('faturamento-docs')
              .getPublicUrl(`${uploadBasePath}/${file.name}`);
            const url = new URL(urlData.publicUrl);
            url.searchParams.set('v', String(Date.now()));
            return url.toString();
          }

          return current;
        };

        const { error: contaPagarError } = await supabase
          .from('contas_pagar')
          .update({
            valor,
            link_nf: mostRecentPathFor('nf', linkNf),
            link_boleto: mostRecentPathFor('boleto', linkBoleto),
          })
          .eq('id', record.conta_pagar_id);
        if (contaPagarError) throw contaPagarError;
      }

      // 3. Upsert controle_beneficios
      const vencDate = new Date();
      const beneficioPayload: any = {
        fornecedor_id: record.fornecedor_id,
        contrato_id: record.contrato_id,
        parcela_id: record.parcela_id,
        conta_pagar_id: record.conta_pagar_id,
        tipo_beneficio: tipoBeneficio,
        valor,
        observacoes: observacoes || null,
        mes_referencia: vencDate.getMonth() + 1,
        ano_referencia: vencDate.getFullYear(),
      };

      if (record.beneficio_id) {
        await supabase
          .from('controle_beneficios')
          .update(beneficioPayload)
          .eq('id', record.beneficio_id);
      } else {
        await supabase
          .from('controle_beneficios')
          .insert({ ...beneficioPayload, created_by: user?.id });
      }

      // 4. Update centro de custo rateio for the contract
      await supabase
        .from('contratos_centros_custo')
        .delete()
        .eq('contrato_id', record.contrato_id);

      if (centroCustoRateio.length > 0) {
        const rateioInserts = centroCustoRateio.map(item => ({
          contrato_id: record.contrato_id,
          centro_custo_id: item.centro_custo_id,
          percentual: item.percentual,
          valor: valor * item.percentual / 100,
        }));

        const { error: rateioError } = await supabase
          .from('contratos_centros_custo')
          .insert(rateioInserts);
        if (rateioError) throw rateioError;
      }

      toast({ title: 'Sucesso', description: 'Benefício atualizado com sucesso.' });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar benefício:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!record) return null;

  const uploadBasePath = `beneficios/${record.contrato_id}/${record.parcela_id}`;
  const nfUploadPath = `${uploadBasePath}/nf.pdf`;
  const boletoUploadPath = `${uploadBasePath}/boleto.pdf`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Benefício - {record.fornecedor_razao_social}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Benefício</Label>
              <Select value={tipoBeneficio} onValueChange={setTipoBeneficio}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tiposBeneficio.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor da Parcela</Label>
              <CurrencyInput value={valor} onChange={setValor} />
            </div>
          </div>

          <div>
            <CentroCustoRateio
              value={centroCustoRateio}
              onChange={setCentroCustoRateio}
              valorTotal={valor}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FileUpload
              bucket="faturamento-docs"
              path={nfUploadPath}
              value={linkNf}
              onChange={setLinkNf}
              accept="application/pdf,image/*"
              label="Nota Fiscal (NF)"
            />
            <FileUpload
              bucket="faturamento-docs"
              path={boletoUploadPath}
              value={linkBoleto}
              onChange={setLinkBoleto}
              accept="application/pdf,image/*"
              label="Boleto"
            />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações opcionais..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
