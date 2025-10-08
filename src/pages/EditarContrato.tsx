import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CurrencyInput, PercentageInput } from '@/components/ui/currency-input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function EditarContrato() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dados do contrato
  const [quantidade, setQuantidade] = useState(1);
  const [valorUnitario, setValorUnitario] = useState(0);
  const [descontoTipo, setDescontoTipo] = useState<'percentual' | 'valor'>('percentual');
  const [descontoPercentual, setDescontoPercentual] = useState(0);
  const [descontoValor, setDescontoValor] = useState(0);
  const [irrfPercentual, setIrrfPercentual] = useState(0);
  const [pisPercentual, setPisPercentual] = useState(0);
  const [cofinsPercentual, setCofinsPercentual] = useState(0);
  const [csllPercentual, setCsllPercentual] = useState(0);
  const [descricaoServico, setDescricaoServico] = useState('');
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
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setQuantidade(data.quantidade || 1);
      setValorUnitario(data.valor_unitario || 0);
      setDescontoTipo((data.desconto_tipo as 'percentual' | 'valor') || 'percentual');
      setDescontoPercentual(data.desconto_percentual || 0);
      setDescontoValor(data.desconto_valor || 0);
      setIrrfPercentual(data.irrf_percentual || 0);
      
      const pisCofins = data.pis_cofins_percentual || 0;
      setPisPercentual(pisCofins / 2);
      setCofinsPercentual(pisCofins / 2);
      
      setCsllPercentual(data.csll_percentual || 0);
      setDescricaoServico(data.descricao_servico || '');
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

  const calcularValorTotal = () => {
    const valorBase = quantidade * valorUnitario;
    const desconto = descontoTipo === 'percentual' 
      ? valorBase * (descontoPercentual / 100)
      : descontoValor;
    const valorComDesconto = valorBase - desconto;
    const totalImpostos = (irrfPercentual + pisPercentual + cofinsPercentual + csllPercentual) / 100;
    const valorImpostos = valorComDesconto * totalImpostos;
    return valorComDesconto - valorImpostos;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const valorTotal = calcularValorTotal();

      const { error: contratoError } = await supabase
        .from('contratos')
        .update({
          quantidade,
          valor_unitario: valorUnitario,
          desconto_tipo: descontoTipo,
          desconto_percentual: descontoPercentual,
          desconto_valor: descontoValor,
          irrf_percentual: irrfPercentual,
          pis_cofins_percentual: pisPercentual + cofinsPercentual,
          csll_percentual: csllPercentual,
          valor_total: valorTotal,
          descricao_servico: descricaoServico,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (contratoError) throw contratoError;

      // Atualizar parcelas
      for (const parcela of parcelas) {
        const { error: parcelaError } = await supabase
          .from('parcelas_contrato')
          .update({
            data_vencimento: parcela.data_vencimento,
            valor: parcela.valor,
          })
          .eq('id', parcela.id);

        if (parcelaError) throw parcelaError;
      }

      toast({
        title: "Sucesso",
        description: "Contrato atualizado com sucesso!",
      });

      navigate(`/contratos/${id}`);
    } catch (error) {
      console.error('Erro ao salvar contrato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleParcelaChange = (index: number, field: string, value: any) => {
    const newParcelas = [...parcelas];
    newParcelas[index] = { ...newParcelas[index], [field]: value };
    setParcelas(newParcelas);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/contratos/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Editar Contrato</h1>
          <p className="text-muted-foreground">Atualize as informações do contrato</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Valores e Impostos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input 
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Unitário (R$)</Label>
              <CurrencyInput value={valorUnitario} onChange={setValorUnitario} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Desconto (%)</Label>
              <PercentageInput value={descontoPercentual} onChange={setDescontoPercentual} />
            </div>

            <div className="space-y-2">
              <Label>Desconto (R$)</Label>
              <CurrencyInput value={descontoValor} onChange={setDescontoValor} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>IRRF (%)</Label>
              <PercentageInput value={irrfPercentual} onChange={setIrrfPercentual} />
            </div>

            <div className="space-y-2">
              <Label>PIS (%)</Label>
              <PercentageInput value={pisPercentual} onChange={setPisPercentual} />
            </div>

            <div className="space-y-2">
              <Label>COFINS (%)</Label>
              <PercentageInput value={cofinsPercentual} onChange={setCofinsPercentual} />
            </div>

            <div className="space-y-2">
              <Label>CSLL (%)</Label>
              <PercentageInput value={csllPercentual} onChange={setCsllPercentual} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição do Serviço</Label>
            <Textarea 
              value={descricaoServico}
              onChange={(e) => setDescricaoServico(e.target.value)}
              rows={4}
              placeholder="Descreva o serviço..."
            />
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Valor Total Calculado:</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(calcularValorTotal())}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Editar Parcelas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parcela</TableHead>
                <TableHead>Data Vencimento</TableHead>
                <TableHead>Valor (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((parcela, index) => (
                <TableRow key={parcela.id}>
                  <TableCell>{parcela.numero_parcela}</TableCell>
                  <TableCell>
                    <Input 
                      type="date"
                      value={parcela.data_vencimento}
                      onChange={(e) => handleParcelaChange(index, 'data_vencimento', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <CurrencyInput 
                      value={parcela.valor}
                      onChange={(value) => handleParcelaChange(index, 'valor', value)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => navigate(`/contratos/${id}`)}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </div>
  );
}
