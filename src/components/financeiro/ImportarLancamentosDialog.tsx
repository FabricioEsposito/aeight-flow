import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { format, parse, isValid } from 'date-fns';

interface ImportarLancamentosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface PreviewRow {
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_competencia: string;
  cliente_fornecedor_nome: string;
  plano_conta_codigo?: string;
  centro_custo_codigo?: string;
  conta_bancaria_nome?: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  willCreateClienteFornecedor: boolean;
  cnpjCpfParaCriar?: string;
  nomeParaCriar?: string;
  // Resolved IDs
  cliente_id?: string;
  fornecedor_id?: string;
  plano_conta_id?: string;
  centro_custo?: string;
  conta_bancaria_id?: string;
}

export function ImportarLancamentosDialog({ open, onOpenChange, onSuccess }: ImportarLancamentosDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, errors: 0, created: 0 });
  const [autoCriarClienteFornecedor, setAutoCriarClienteFornecedor] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template = [
      {
        'Tipo (entrada/saida)': 'entrada',
        'Descrição': 'Exemplo de lançamento',
        'Valor': 1500.50,
        'Data Vencimento (DD/MM/AAAA)': format(new Date(), 'dd/MM/yyyy'),
        'Data Competência (DD/MM/AAAA)': format(new Date(), 'dd/MM/yyyy'),
        'CNPJ/CPF': '00.000.000/0001-00',
        'Cliente/Fornecedor (Nome Fantasia ou Razão Social)': '',
        'Plano de Contas (Código)': '1.1.01',
        'Centro de Custo (Código)': 'CC001',
        'Conta Bancária (Descrição)': 'Conta Principal',
      },
      {
        'Tipo (entrada/saida)': 'saida',
        'Descrição': 'Outro exemplo',
        'Valor': 500.00,
        'Data Vencimento (DD/MM/AAAA)': format(new Date(), 'dd/MM/yyyy'),
        'Data Competência (DD/MM/AAAA)': format(new Date(), 'dd/MM/yyyy'),
        'CNPJ/CPF': '',
        'Cliente/Fornecedor (Nome Fantasia ou Razão Social)': 'Nome do Fornecedor',
        'Plano de Contas (Código)': '2.1.01',
        'Centro de Custo (Código)': '',
        'Conta Bancária (Descrição)': '',
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    
    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 20 }, // Tipo
      { wch: 30 }, // Descrição
      { wch: 15 }, // Valor
      { wch: 25 }, // Data Vencimento
      { wch: 25 }, // Data Competência
      { wch: 22 }, // CNPJ/CPF
      { wch: 45 }, // Cliente/Fornecedor
      { wch: 25 }, // Plano de Contas
      { wch: 25 }, // Centro de Custo
      { wch: 30 }, // Conta Bancária
    ];

    XLSX.writeFile(wb, 'modelo_importacao_lancamentos.xlsx');
    toast({
      title: "Download iniciado",
      description: "O modelo de planilha foi baixado com sucesso.",
    });
  };

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    // Tentar diversos formatos
    const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'MM/dd/yyyy'];
    
    for (const fmt of formats) {
      try {
        const parsed = parse(dateStr.toString().trim(), fmt, new Date());
        if (isValid(parsed)) {
          return format(parsed, 'yyyy-MM-dd');
        }
      } catch {
        continue;
      }
    }
    
    // Tentar parsing direto
    try {
      const direct = new Date(dateStr);
      if (isValid(direct)) {
        return format(direct, 'yyyy-MM-dd');
      }
    } catch {
      // ignorar
    }
    
    return null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast({
          title: "Arquivo vazio",
          description: "A planilha não contém dados para importar.",
          variant: "destructive",
        });
        return;
      }

      // Buscar dados para validação
      const [clientesRes, fornecedoresRes, planoContasRes, centrosCustoRes, contasBancariasRes] = await Promise.all([
        supabase.from('clientes').select('id, razao_social, nome_fantasia, cnpj_cpf'),
        supabase.from('fornecedores').select('id, razao_social, nome_fantasia, cnpj_cpf'),
        supabase.from('plano_contas').select('id, codigo, descricao').eq('status', 'ativo'),
        supabase.from('centros_custo').select('id, codigo, descricao').eq('status', 'ativo'),
        supabase.from('contas_bancarias').select('id, descricao, banco').eq('status', 'ativo'),
      ]);

      const clientes = clientesRes.data || [];
      const fornecedores = fornecedoresRes.data || [];
      const planoContas = planoContasRes.data || [];
      const centrosCusto = centrosCustoRes.data || [];
      const contasBancarias = contasBancariasRes.data || [];

      // Processar cada linha
      const preview: PreviewRow[] = jsonData.map((row: any) => {
        const errors: string[] = [];
        
        // Tipo
        const tipoRaw = (row['Tipo (entrada/saida)'] || row['Tipo'] || '').toString().toLowerCase().trim();
        const tipo = tipoRaw === 'entrada' || tipoRaw === 'saida' ? tipoRaw : null;
        if (!tipo) errors.push('Tipo inválido (use "entrada" ou "saida")');

        // Descrição
        const descricao = (row['Descrição'] || '').toString().trim();
        if (!descricao) errors.push('Descrição obrigatória');

        // Valor
        let valor = 0;
        const valorRaw = row['Valor'];
        if (typeof valorRaw === 'number') {
          valor = valorRaw;
        } else if (typeof valorRaw === 'string') {
          valor = parseFloat(valorRaw.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
        }
        if (valor <= 0) errors.push('Valor deve ser maior que zero');

        // Datas
        const dataVencimento = parseDate(row['Data Vencimento (DD/MM/AAAA)'] || row['Data Vencimento'] || '');
        const dataCompetencia = parseDate(row['Data Competência (DD/MM/AAAA)'] || row['Data Competência'] || '');
        if (!dataVencimento) errors.push('Data de vencimento inválida');
        if (!dataCompetencia) errors.push('Data de competência inválida');

        // CNPJ/CPF - prioridade para busca
        const cnpjCpf = (row['CNPJ/CPF'] || row['CNPJ'] || row['CPF'] || '').toString().trim().replace(/[^\d]/g, '');
        const cnpjCpfOriginal = (row['CNPJ/CPF'] || row['CNPJ'] || row['CPF'] || '').toString().trim();
        
        // Cliente/Fornecedor
        const clienteFornecedorNome = (row['Cliente/Fornecedor (Nome Fantasia ou Razão Social)'] || row['Cliente/Fornecedor'] || '').toString().trim();
        let cliente_id: string | undefined;
        let fornecedor_id: string | undefined;
        let nomeEncontrado = '';
        let willCreateClienteFornecedor = false;
        let cnpjCpfParaCriar: string | undefined;
        let nomeParaCriar: string | undefined;
        const warnings: string[] = [];

        if (tipo === 'entrada') {
          // Buscar cliente: primeiro por CNPJ, depois por nome
          let cliente;
          if (cnpjCpf) {
            cliente = clientes.find(c => c.cnpj_cpf?.replace(/[^\d]/g, '') === cnpjCpf);
          }
          if (!cliente && clienteFornecedorNome) {
            cliente = clientes.find(c => 
              c.nome_fantasia?.toLowerCase() === clienteFornecedorNome.toLowerCase() ||
              c.razao_social?.toLowerCase() === clienteFornecedorNome.toLowerCase()
            );
          }
          if (cliente) {
            cliente_id = cliente.id;
            nomeEncontrado = cliente.nome_fantasia || cliente.razao_social;
          } else if (cnpjCpf) {
            // CNPJ informado mas não encontrado - pode criar automaticamente
            willCreateClienteFornecedor = true;
            cnpjCpfParaCriar = cnpjCpfOriginal;
            nomeParaCriar = clienteFornecedorNome || `Cliente ${cnpjCpfOriginal}`;
            nomeEncontrado = nomeParaCriar;
            warnings.push(`Cliente será criado: ${nomeParaCriar}`);
          } else if (clienteFornecedorNome) {
            errors.push(`Cliente "${clienteFornecedorNome}" não encontrado. Informe o CNPJ para criar automaticamente.`);
          } else {
            errors.push('CNPJ ou Nome do Cliente é obrigatório');
          }
        } else if (tipo === 'saida') {
          // Buscar fornecedor: primeiro por CNPJ, depois por nome
          let fornecedor;
          if (cnpjCpf) {
            fornecedor = fornecedores.find(f => f.cnpj_cpf?.replace(/[^\d]/g, '') === cnpjCpf);
          }
          if (!fornecedor && clienteFornecedorNome) {
            fornecedor = fornecedores.find(f => 
              f.nome_fantasia?.toLowerCase() === clienteFornecedorNome.toLowerCase() ||
              f.razao_social?.toLowerCase() === clienteFornecedorNome.toLowerCase()
            );
          }
          if (fornecedor) {
            fornecedor_id = fornecedor.id;
            nomeEncontrado = fornecedor.nome_fantasia || fornecedor.razao_social;
          } else if (cnpjCpf) {
            // CNPJ informado mas não encontrado - pode criar automaticamente
            willCreateClienteFornecedor = true;
            cnpjCpfParaCriar = cnpjCpfOriginal;
            nomeParaCriar = clienteFornecedorNome || `Fornecedor ${cnpjCpfOriginal}`;
            nomeEncontrado = nomeParaCriar;
            warnings.push(`Fornecedor será criado: ${nomeParaCriar}`);
          } else if (clienteFornecedorNome) {
            errors.push(`Fornecedor "${clienteFornecedorNome}" não encontrado. Informe o CNPJ para criar automaticamente.`);
          } else {
            errors.push('CNPJ ou Nome do Fornecedor é obrigatório');
          }
        }

        // Plano de Contas (opcional)
        const planoContaCodigo = (row['Plano de Contas (Código)'] || row['Plano de Contas'] || '').toString().trim();
        let plano_conta_id: string | undefined;
        if (planoContaCodigo) {
          const plano = planoContas.find(p => p.codigo === planoContaCodigo);
          if (plano) {
            plano_conta_id = plano.id;
          } else {
            errors.push(`Plano de contas "${planoContaCodigo}" não encontrado`);
          }
        }

        // Centro de Custo (opcional)
        const centroCustoCodigo = (row['Centro de Custo (Código)'] || row['Centro de Custo'] || '').toString().trim();
        let centro_custo: string | undefined;
        if (centroCustoCodigo) {
          const centro = centrosCusto.find(c => c.codigo === centroCustoCodigo);
          if (centro) {
            centro_custo = centro.id;
          } else {
            errors.push(`Centro de custo "${centroCustoCodigo}" não encontrado`);
          }
        }

        // Conta Bancária (opcional)
        const contaBancariaNome = (row['Conta Bancária (Descrição)'] || row['Conta Bancária'] || '').toString().trim();
        let conta_bancaria_id: string | undefined;
        if (contaBancariaNome) {
          const conta = contasBancarias.find(c => 
            c.descricao.toLowerCase() === contaBancariaNome.toLowerCase()
          );
          if (conta) {
            conta_bancaria_id = conta.id;
          } else {
            errors.push(`Conta bancária "${contaBancariaNome}" não encontrada`);
          }
        }

        // Se vai criar cliente/fornecedor mas auto-criar está desabilitado, é erro
        const finalErrors = [...errors];
        if (willCreateClienteFornecedor && !autoCriarClienteFornecedor) {
          finalErrors.push(tipo === 'entrada' 
            ? `Cliente não encontrado (CNPJ: ${cnpjCpfOriginal}). Habilite "Criar automaticamente" ou cadastre manualmente.`
            : `Fornecedor não encontrado (CNPJ: ${cnpjCpfOriginal}). Habilite "Criar automaticamente" ou cadastre manualmente.`
          );
          willCreateClienteFornecedor = false;
        }

        return {
          tipo: tipo as 'entrada' | 'saida',
          descricao,
          valor,
          data_vencimento: dataVencimento || '',
          data_competencia: dataCompetencia || '',
          cliente_fornecedor_nome: nomeEncontrado || clienteFornecedorNome || cnpjCpf,
          plano_conta_codigo: planoContaCodigo,
          centro_custo_codigo: centroCustoCodigo,
          conta_bancaria_nome: contaBancariaNome,
          valid: finalErrors.length === 0,
          errors: finalErrors,
          warnings,
          willCreateClienteFornecedor: autoCriarClienteFornecedor && willCreateClienteFornecedor,
          cnpjCpfParaCriar,
          nomeParaCriar,
          cliente_id,
          fornecedor_id,
          plano_conta_id,
          centro_custo,
          conta_bancaria_id,
        };
      });

      setPreviewData(preview);
      setStep('preview');
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: "Verifique se o arquivo está no formato correto (.xlsx ou .xls)",
        variant: "destructive",
      });
    }

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatCnpjCpf = (value: string): string => {
    const digits = value.replace(/[^\d]/g, '');
    if (digits.length === 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (digits.length === 14) {
      return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const determineTipoPessoa = (cnpjCpf: string): 'fisica' | 'juridica' => {
    const digits = cnpjCpf.replace(/[^\d]/g, '');
    return digits.length === 11 ? 'fisica' : 'juridica';
  };

  const handleImport = async () => {
    const validRows = previewData.filter(row => row.valid);
    if (validRows.length === 0) {
      toast({
        title: "Nenhum registro válido",
        description: "Corrija os erros na planilha e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setStep('importing');
    setProgress({ current: 0, total: validRows.length, success: 0, errors: 0, created: 0 });

    let successCount = 0;
    let errorCount = 0;
    let createdCount = 0;

    // Cache para clientes/fornecedores criados nesta importação
    const createdClientes: Map<string, string> = new Map();
    const createdFornecedores: Map<string, string> = new Map();

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      
      try {
        let clienteId = row.cliente_id;
        let fornecedorId = row.fornecedor_id;

        // Criar cliente/fornecedor se necessário
        if (row.willCreateClienteFornecedor && row.cnpjCpfParaCriar) {
          const cnpjKey = row.cnpjCpfParaCriar.replace(/[^\d]/g, '');
          
          if (row.tipo === 'entrada') {
            // Verificar se já criamos este cliente nesta importação
            if (createdClientes.has(cnpjKey)) {
              clienteId = createdClientes.get(cnpjKey);
            } else {
              const { data: novoCliente, error } = await supabase
                .from('clientes')
                .insert({
                  cnpj_cpf: formatCnpjCpf(row.cnpjCpfParaCriar),
                  razao_social: row.nomeParaCriar || `Cliente ${row.cnpjCpfParaCriar}`,
                  tipo_pessoa: determineTipoPessoa(row.cnpjCpfParaCriar),
                  status: 'ativo',
                })
                .select('id')
                .single();
              
              if (error) throw error;
              clienteId = novoCliente.id;
              createdClientes.set(cnpjKey, novoCliente.id);
              createdCount++;
            }
          } else {
            // Verificar se já criamos este fornecedor nesta importação
            if (createdFornecedores.has(cnpjKey)) {
              fornecedorId = createdFornecedores.get(cnpjKey);
            } else {
              const { data: novoFornecedor, error } = await supabase
                .from('fornecedores')
                .insert({
                  cnpj_cpf: formatCnpjCpf(row.cnpjCpfParaCriar),
                  razao_social: row.nomeParaCriar || `Fornecedor ${row.cnpjCpfParaCriar}`,
                  tipo_pessoa: determineTipoPessoa(row.cnpjCpfParaCriar),
                  status: 'ativo',
                })
                .select('id')
                .single();
              
              if (error) throw error;
              fornecedorId = novoFornecedor.id;
              createdFornecedores.set(cnpjKey, novoFornecedor.id);
              createdCount++;
            }
          }
        }

        if (row.tipo === 'entrada') {
          const { error } = await supabase.from('contas_receber').insert({
            cliente_id: clienteId!,
            descricao: row.descricao,
            valor: row.valor,
            data_vencimento: row.data_vencimento,
            data_competencia: row.data_competencia,
            plano_conta_id: row.plano_conta_id || null,
            centro_custo: row.centro_custo || null,
            conta_bancaria_id: row.conta_bancaria_id || null,
            status: 'pendente',
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.from('contas_pagar').insert({
            fornecedor_id: fornecedorId!,
            descricao: row.descricao,
            valor: row.valor,
            data_vencimento: row.data_vencimento,
            data_competencia: row.data_competencia,
            plano_conta_id: row.plano_conta_id || null,
            centro_custo: row.centro_custo || null,
            conta_bancaria_id: row.conta_bancaria_id || null,
            status: 'pendente',
          });
          if (error) throw error;
        }
        successCount++;
      } catch (error) {
        console.error('Erro ao importar linha:', error);
        errorCount++;
      }

      setProgress({
        current: i + 1,
        total: validRows.length,
        success: successCount,
        errors: errorCount,
        created: createdCount,
      });
    }

    setImporting(false);
    
    const createdMsg = createdCount > 0 ? ` ${createdCount} cliente(s)/fornecedor(es) criado(s).` : '';
    toast({
      title: "Importação concluída",
      description: `${successCount} lançamento(s) importado(s) com sucesso.${createdMsg} ${errorCount} erro(s).`,
      variant: errorCount > 0 ? "destructive" : "default",
    });

    if (successCount > 0) {
      onSuccess();
      onOpenChange(false);
      setStep('upload');
      setPreviewData([]);
    }
  };

  const handleClose = () => {
    if (!importing) {
      onOpenChange(false);
      setStep('upload');
      setPreviewData([]);
    }
  };

  const validCount = previewData.filter(r => r.valid).length;
  const invalidCount = previewData.filter(r => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Lançamentos via Excel</DialogTitle>
          <DialogDescription>
            Importe lançamentos avulsos (contas a receber e a pagar) através de uma planilha Excel.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Baixar Modelo de Planilha
              </Button>
            </div>

            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Arraste um arquivo ou clique para selecionar</p>
                <p className="text-sm text-muted-foreground">Formatos suportados: .xlsx, .xls</p>
              </label>
            </div>

            <div className="flex items-center space-x-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <Checkbox 
                id="auto-criar" 
                checked={autoCriarClienteFornecedor}
                onCheckedChange={(checked) => setAutoCriarClienteFornecedor(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="auto-criar" className="flex items-center gap-2 cursor-pointer">
                  <UserPlus className="w-4 h-4 text-primary" />
                  Criar cliente/fornecedor automaticamente
                </Label>
                <p className="text-xs text-muted-foreground">
                  Se o CNPJ/CPF não for encontrado, um novo cadastro será criado com os dados informados
                </p>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Instruções:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Baixe o modelo de planilha clicando no botão acima</li>
                <li>Preencha os dados conforme o modelo (campos obrigatórios: Tipo, Descrição, Valor, Datas)</li>
                <li>Use <strong>CNPJ/CPF</strong> para identificar o cliente/fornecedor automaticamente (prioridade sobre o nome)</li>
                <li>Se o CNPJ não for encontrado e a opção acima estiver habilitada, será criado automaticamente</li>
                <li>Para <strong>entradas</strong>, será criado/buscado um <strong>cliente</strong></li>
                <li>Para <strong>saídas</strong>, será criado/buscado um <strong>fornecedor</strong></li>
                <li>Plano de Contas, Centro de Custo e Conta Bancária são opcionais</li>
                <li>Faça upload do arquivo preenchido para visualizar e importar</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {validCount} válido(s)
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {invalidCount} com erro(s)
                </Badge>
              )}
              {previewData.filter(r => r.willCreateClienteFornecedor).length > 0 && (
                <Badge variant="outline" className="gap-1 border-primary text-primary">
                  <UserPlus className="w-3 h-3" />
                  {previewData.filter(r => r.willCreateClienteFornecedor).length} será(ão) criado(s)
                </Badge>
              )}
            </div>

            <div className="border rounded-lg max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Cliente/Fornecedor</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow 
                      key={index} 
                      className={
                        !row.valid 
                          ? 'bg-destructive/10' 
                          : row.willCreateClienteFornecedor 
                            ? 'bg-primary/5' 
                            : ''
                      }
                    >
                      <TableCell>
                        {row.valid ? (
                          row.willCreateClienteFornecedor ? (
                            <UserPlus className="w-4 h-4 text-primary" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          )
                        ) : (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.tipo === 'entrada' ? 'default' : 'secondary'}>
                          {row.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">{row.descricao}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.valor)}
                      </TableCell>
                      <TableCell>{row.data_vencimento ? format(new Date(row.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        <div className="flex items-center gap-1">
                          {row.willCreateClienteFornecedor && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary">NOVO</Badge>
                          )}
                          {row.cliente_fornecedor_nome}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px]">
                        {row.errors.length > 0 && (
                          <span className="text-destructive">{row.errors.join('; ')}</span>
                        )}
                        {row.warnings.length > 0 && row.errors.length === 0 && (
                          <span className="text-primary">{row.warnings.join('; ')}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                <Upload className="w-4 h-4 mr-2" />
                Importar {validCount} Lançamento(s)
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-lg font-medium">Importando lançamentos...</p>
              <p className="text-muted-foreground">
                {progress.current} de {progress.total} processados
              </p>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <div className="flex justify-center gap-4 text-sm">
              <span className="text-emerald-600">{progress.success} sucesso</span>
              {progress.created > 0 && (
                <span className="text-primary">{progress.created} cadastro(s) criado(s)</span>
              )}
              {progress.errors > 0 && (
                <span className="text-destructive">{progress.errors} erros</span>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
