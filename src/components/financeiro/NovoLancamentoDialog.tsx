import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ClienteSelect } from '@/components/contratos/ClienteSelect';
import { FornecedorSelect } from '@/components/contratos/FornecedorSelect';
import { PlanoContasSelect } from '@/components/contratos/PlanoContasSelect';
import CentroCustoSelect from '@/components/centro-custos/CentroCustoSelect';
import { supabase } from '@/integrations/supabase/client';

interface NovoLancamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function NovoLancamentoDialog({ open, onOpenChange, onSave }: NovoLancamentoDialogProps) {
  const [tipoLancamento, setTipoLancamento] = useState<'receita' | 'despesa'>('receita');
  const [clienteId, setClienteId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [dataCompetencia, setDataCompetencia] = useState<Date>(new Date());
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [centroCustoId, setCentroCustoId] = useState('');
  const [codigoReferencia, setCodigoReferencia] = useState('');
  const [parcelamento, setParcelamento] = useState('a-vista');
  const [numeroParcelas, setNumeroParcelas] = useState('1');
  const [dataVencimento, setDataVencimento] = useState<Date>(new Date());
  const [formaPagamento, setFormaPagamento] = useState('');
  const [contaBancariaId, setContaBancariaId] = useState('');
  const [recebidoPago, setRecebidoPago] = useState(false);
  const [informarNsu, setInformarNsu] = useState(false);
  const [nsu, setNsu] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [contasBancarias, setContasBancarias] = useState<Array<{ id: string; descricao: string; banco: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchContasBancarias();
      resetForm();
    }
  }, [open]);

  const fetchContasBancarias = async () => {
    const { data } = await supabase
      .from('contas_bancarias')
      .select('id, descricao, banco')
      .eq('status', 'ativo')
      .order('descricao');
    
    if (data) setContasBancarias(data);
  };

  const resetForm = () => {
    setClienteId('');
    setFornecedorId('');
    setDataCompetencia(new Date());
    setDescricao('');
    setValor('');
    setCategoriaId('');
    setCentroCustoId('');
    setCodigoReferencia('');
    setParcelamento('a-vista');
    setNumeroParcelas('1');
    setDataVencimento(new Date());
    setFormaPagamento('');
    setContaBancariaId('');
    setRecebidoPago(false);
    setInformarNsu(false);
    setNsu('');
    setObservacoes('');
  };

  const parseValor = (valorStr: string): number => {
    const cleaned = valorStr.replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const valorTotal = parseValor(valor);
      const numParcelas = parseInt(numeroParcelas) || 1;
      const valorParcela = valorTotal / numParcelas;

      if (tipoLancamento === 'receita') {
        // Criar conta a receber
        const { error } = await supabase.from('contas_receber').insert({
          cliente_id: clienteId,
          descricao,
          valor: valorTotal,
          valor_original: valorTotal,
          data_competencia: format(dataCompetencia, 'yyyy-MM-dd'),
          data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
          plano_conta_id: categoriaId || null,
          centro_custo: centroCustoId || null,
          conta_bancaria_id: contaBancariaId || null,
          status: recebidoPago ? 'pago' : 'pendente',
          data_recebimento: recebidoPago ? format(new Date(), 'yyyy-MM-dd') : null,
          observacoes: observacoes || null,
          numero_nf: informarNsu ? nsu : null,
        });

        if (error) throw error;
      } else {
        // Criar conta a pagar
        const { error } = await supabase.from('contas_pagar').insert({
          fornecedor_id: fornecedorId,
          descricao,
          valor: valorTotal,
          valor_original: valorTotal,
          data_competencia: format(dataCompetencia, 'yyyy-MM-dd'),
          data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
          plano_conta_id: categoriaId || null,
          centro_custo: centroCustoId || null,
          conta_bancaria_id: contaBancariaId || null,
          status: recebidoPago ? 'pago' : 'pendente',
          data_pagamento: recebidoPago ? format(new Date(), 'yyyy-MM-dd') : null,
          observacoes: observacoes || null,
        });

        if (error) throw error;
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar lançamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    if (tipoLancamento === 'receita') {
      return clienteId && descricao && valor && dataCompetencia && dataVencimento;
    } else {
      return fornecedorId && descricao && valor && dataCompetencia && dataVencimento;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lançamento</DialogTitle>
        </DialogHeader>

        <Tabs value={tipoLancamento} onValueChange={(v) => setTipoLancamento(v as 'receita' | 'despesa')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="receita">Nova Receita</TabsTrigger>
            <TabsTrigger value="despesa">Nova Despesa</TabsTrigger>
          </TabsList>

          <TabsContent value="receita" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Informações do lançamento</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <ClienteSelect value={clienteId} onChange={setClienteId} />
                </div>

                <div className="space-y-2">
                  <Label>Data de competência *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dataCompetencia, "dd/MM/yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dataCompetencia}
                        onSelect={(date) => date && setDataCompetencia(date)}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descrição do lançamento"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <PlanoContasSelect 
                    value={categoriaId} 
                    onChange={setCategoriaId}
                    tipo="entrada"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Centro de custo</Label>
                  <CentroCustoSelect 
                    value={centroCustoId}
                    onValueChange={setCentroCustoId}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Código de referência</Label>
                  <Input
                    value={codigoReferencia}
                    onChange={(e) => setCodigoReferencia(e.target.value)}
                    placeholder="Código"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium text-lg">Condição de pagamento</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parcelamento *</Label>
                  <Select value={parcelamento} onValueChange={setParcelamento}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a-vista">À vista</SelectItem>
                      <SelectItem value="parcelado">Parcelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Vencimento *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dataVencimento, "dd/MM/yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dataVencimento}
                        onSelect={(date) => date && setDataVencimento(date)}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Forma de pagamento</Label>
                  <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="cartao-credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="cartao-debito">Cartão de Débito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Conta de recebimento</Label>
                  <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasBancarias.map((conta) => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.descricao} - {conta.banco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="recebido" 
                    checked={recebidoPago}
                    onCheckedChange={(checked) => setRecebidoPago(checked === true)}
                  />
                  <label htmlFor="recebido" className="text-sm cursor-pointer">Recebido</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="informar-nsu" 
                    checked={informarNsu}
                    onCheckedChange={(checked) => setInformarNsu(checked === true)}
                  />
                  <label htmlFor="informar-nsu" className="text-sm cursor-pointer">Informar NSU?</label>
                </div>
              </div>

              {informarNsu && (
                <div className="space-y-2">
                  <Label>Número NSU/NF</Label>
                  <Input
                    value={nsu}
                    onChange={(e) => setNsu(e.target.value)}
                    placeholder="Número da nota fiscal"
                  />
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <Tabs defaultValue="observacoes">
                <TabsList>
                  <TabsTrigger value="observacoes">Observações</TabsTrigger>
                  <TabsTrigger value="anexo">Anexo</TabsTrigger>
                </TabsList>
                <TabsContent value="observacoes" className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Descreva observações relevantes sobre esse lançamento financeiro"
                    rows={4}
                  />
                </TabsContent>
                <TabsContent value="anexo">
                  <p className="text-sm text-muted-foreground">Funcionalidade de anexo em desenvolvimento</p>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="despesa" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Informações do lançamento</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <FornecedorSelect value={fornecedorId} onChange={setFornecedorId} />
                </div>

                <div className="space-y-2">
                  <Label>Data de competência *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dataCompetencia, "dd/MM/yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dataCompetencia}
                        onSelect={(date) => date && setDataCompetencia(date)}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descrição do lançamento"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <PlanoContasSelect 
                    value={categoriaId} 
                    onChange={setCategoriaId}
                    tipo="saida"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Centro de custo</Label>
                  <CentroCustoSelect 
                    value={centroCustoId}
                    onValueChange={setCentroCustoId}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Código de referência</Label>
                  <Input
                    value={codigoReferencia}
                    onChange={(e) => setCodigoReferencia(e.target.value)}
                    placeholder="Código"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium text-lg">Condição de pagamento</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parcelamento *</Label>
                  <Select value={parcelamento} onValueChange={setParcelamento}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a-vista">À vista</SelectItem>
                      <SelectItem value="parcelado">Parcelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Vencimento *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dataVencimento, "dd/MM/yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dataVencimento}
                        onSelect={(date) => date && setDataVencimento(date)}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Forma de pagamento</Label>
                  <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="cartao-credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="cartao-debito">Cartão de Débito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Conta de pagamento</Label>
                  <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasBancarias.map((conta) => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.descricao} - {conta.banco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="pago" 
                    checked={recebidoPago}
                    onCheckedChange={(checked) => setRecebidoPago(checked === true)}
                  />
                  <label htmlFor="pago" className="text-sm cursor-pointer">Pago</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="agendado" 
                    checked={false}
                    onCheckedChange={() => {}}
                  />
                  <label htmlFor="agendado" className="text-sm cursor-pointer">Agendado</label>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Tabs defaultValue="observacoes">
                <TabsList>
                  <TabsTrigger value="observacoes">Observações</TabsTrigger>
                  <TabsTrigger value="anexo">Anexo</TabsTrigger>
                </TabsList>
                <TabsContent value="observacoes" className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Descreva observações relevantes sobre esse lançamento financeiro"
                    rows={4}
                  />
                </TabsContent>
                <TabsContent value="anexo">
                  <p className="text-sm text-muted-foreground">Funcionalidade de anexo em desenvolvimento</p>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid() || loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
