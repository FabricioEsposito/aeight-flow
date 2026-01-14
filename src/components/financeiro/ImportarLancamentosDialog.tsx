import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, UserPlus, Pencil, Mail, Phone, Loader2, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { format, parse, isValid } from 'date-fns';

interface ImportarLancamentosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CnpjApiData {
  razao_social: string;
  nome_fantasia?: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
}

interface NovosCadastrosContato {
  emails: string[]; // Suporte a múltiplos e-mails
  telefone?: string;
  nomeFantasia?: string;
  // Dados de endereço obtidos da API
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  apiLoaded?: boolean; // Indica se os dados foram carregados da API
}

interface PreviewRow {
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_competencia: string;
  // Valores originais da planilha para exibição
  data_vencimento_original?: string;
  data_competencia_original?: string;
  cliente_fornecedor_nome: string;
  plano_conta_codigo?: string;
  centro_custo_codigo?: string;
  conta_bancaria_nome?: string;
  servico_codigo?: string;
  servico_nome?: string;
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
  servico_id?: string;
}

interface ValidationError {
  linha: number;
  campo: string;
  valorAtual: string;
  mensagem: string;
}

interface ValidationProgress {
  current: number;
  total: number;
  phase: 'lendo' | 'validando' | 'concluido';
}

export function ImportarLancamentosDialog({ open, onOpenChange, onSuccess }: ImportarLancamentosDialogProps) {
  const [step, setStep] = useState<'upload' | 'validating' | 'validation-errors' | 'preview' | 'loading-cnpj' | 'edit-novos' | 'importing'>('upload');
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, errors: 0, created: 0 });
  const [cnpjProgress, setCnpjProgress] = useState({ current: 0, total: 0, currentCnpj: '' });
  const [validationProgress, setValidationProgress] = useState<ValidationProgress>({ current: 0, total: 0, phase: 'lendo' });
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [autoCriarClienteFornecedor, setAutoCriarClienteFornecedor] = useState(true);
  // Map de CNPJ para dados de contato dos novos cadastros
  const [novosCadastrosContato, setNovosCadastrosContato] = useState<Map<string, NovosCadastrosContato>>(new Map());
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
        'Serviço (Código)': 'SRV001',
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
        'Serviço (Código)': '',
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
      { wch: 20 }, // Serviço
    ];

    XLSX.writeFile(wb, 'modelo_importacao_lancamentos.xlsx');
    toast({
      title: "Download iniciado",
      description: "O modelo de planilha foi baixado com sucesso.",
    });
  };

  const parseDate = (dateValue: any): string | null => {
    if (!dateValue && dateValue !== 0) return null;
    
    // Se for número, tratar como serial do Excel (dias desde 01/01/1900)
    if (typeof dateValue === 'number') {
      // Excel usa 1 = 01/01/1900, mas tem um bug que considera 1900 como ano bissexto
      // Por isso subtraímos 2 dias: 1 para ajustar o offset e 1 para o bug do ano bissexto
      const excelEpoch = new Date(1900, 0, 1);
      const jsDate = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
      
      if (isValid(jsDate) && jsDate.getFullYear() >= 1970 && jsDate.getFullYear() <= 2100) {
        return format(jsDate, 'yyyy-MM-dd');
      }
      return null;
    }
    
    const dateStr = String(dateValue).trim();
    if (!dateStr) return null;
    
    // NOVA VERIFICAÇÃO: Se string contém apenas números (4-6 dígitos), 
    // tratar como serial do Excel que foi convertido para string
    if (/^\d{4,6}$/.test(dateStr)) {
      const serialNumber = parseInt(dateStr, 10);
      if (serialNumber > 1000 && serialNumber < 100000) {
        const excelEpoch = new Date(1900, 0, 1);
        const jsDate = new Date(excelEpoch.getTime() + (serialNumber - 2) * 24 * 60 * 60 * 1000);
        if (isValid(jsDate) && jsDate.getFullYear() >= 1970 && jsDate.getFullYear() <= 2100) {
          return format(jsDate, 'yyyy-MM-dd');
        }
      }
    }
    
    // Tentar diversos formatos de string
    const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'MM/dd/yyyy', 'd/M/yyyy'];
    
    for (const fmt of formats) {
      try {
        const parsed = parse(dateStr, fmt, new Date());
        if (isValid(parsed) && parsed.getFullYear() >= 1970 && parsed.getFullYear() <= 2100) {
          return format(parsed, 'yyyy-MM-dd');
        }
      } catch {
        continue;
      }
    }
    
    // Tentar parsing direto (cuidado: pode interpretar números como timestamp)
    try {
      const direct = new Date(dateStr);
      if (isValid(direct) && direct.getFullYear() >= 1970 && direct.getFullYear() <= 2100) {
        return format(direct, 'yyyy-MM-dd');
      }
    } catch {
      // ignorar
    }
    
    return null;
  };

  // Função para validar formato do CNPJ/CPF
  const validarCnpjCpf = (valor: string): { valido: boolean; tipo: 'cnpj' | 'cpf' | 'invalido'; mensagem: string } => {
    const digitos = valor.replace(/\D/g, '');
    
    if (digitos.length === 0) {
      return { valido: true, tipo: 'invalido', mensagem: '' }; // Campo vazio é permitido se nome for informado
    }
    
    if (digitos.length === 11) {
      // Validar CPF
      if (/^(\d)\1{10}$/.test(digitos)) {
        return { valido: false, tipo: 'cpf', mensagem: 'CPF inválido (todos dígitos iguais)' };
      }
      return { valido: true, tipo: 'cpf', mensagem: '' };
    }
    
    if (digitos.length === 14) {
      // Validar CNPJ
      if (/^(\d)\1{13}$/.test(digitos)) {
        return { valido: false, tipo: 'cnpj', mensagem: 'CNPJ inválido (todos dígitos iguais)' };
      }
      return { valido: true, tipo: 'cnpj', mensagem: '' };
    }
    
    return { 
      valido: false, 
      tipo: 'invalido', 
      mensagem: `CNPJ/CPF com ${digitos.length} dígitos. CNPJ deve ter 14 dígitos, CPF deve ter 11` 
    };
  };

  // Função para validar formato de valor
  const validarValor = (valor: any): { valido: boolean; valorNumerico: number; mensagem: string } => {
    if (typeof valor === 'number' && valor > 0) {
      return { valido: true, valorNumerico: valor, mensagem: '' };
    }
    
    if (typeof valor === 'string') {
      const valorLimpo = valor.replace(/[^\d,.-]/g, '').replace(',', '.');
      const numero = parseFloat(valorLimpo);
      
      if (isNaN(numero)) {
        return { valido: false, valorNumerico: 0, mensagem: 'Formato de valor inválido' };
      }
      
      if (numero <= 0) {
        return { valido: false, valorNumerico: numero, mensagem: 'Valor deve ser maior que zero' };
      }
      
      return { valido: true, valorNumerico: numero, mensagem: '' };
    }
    
    return { valido: false, valorNumerico: 0, mensagem: 'Valor não informado ou inválido' };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Limpar estados anteriores
    setValidationErrors([]);
    setPreviewData([]);
    
    // Iniciar validação
    setStep('validating');
    setValidationProgress({ current: 0, total: 0, phase: 'lendo' });

    try {
      // Simular tempo de leitura do arquivo
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
        setStep('upload');
        return;
      }

      // Atualizar para fase de validação
      setValidationProgress({ current: 0, total: jsonData.length, phase: 'validando' });
      
      // Coletar erros de validação
      const errosValidacao: ValidationError[] = [];

      // Validar cada linha da planilha
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any;
        const linhaExcel = i + 2; // +2 porque linha 1 é cabeçalho e index começa em 0
        
        // Atualizar progresso
        setValidationProgress({ current: i + 1, total: jsonData.length, phase: 'validando' });
        
        // Delay para dar tempo de visualizar o progresso
        if (i > 0 && i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Validar Tipo
        const tipoRaw = (row['Tipo (entrada/saida)'] || row['Tipo'] || '').toString().toLowerCase().trim();
        if (!tipoRaw) {
          errosValidacao.push({
            linha: linhaExcel,
            campo: 'Tipo',
            valorAtual: tipoRaw || '(vazio)',
            mensagem: 'Campo obrigatório. Use "entrada" ou "saida"',
          });
        } else if (tipoRaw !== 'entrada' && tipoRaw !== 'saida') {
          errosValidacao.push({
            linha: linhaExcel,
            campo: 'Tipo',
            valorAtual: tipoRaw,
            mensagem: 'Valor inválido. Use "entrada" ou "saida"',
          });
        }

        // Validar Descrição
        const descricao = (row['Descrição'] || '').toString().trim();
        if (!descricao) {
          errosValidacao.push({
            linha: linhaExcel,
            campo: 'Descrição',
            valorAtual: '(vazio)',
            mensagem: 'Campo obrigatório',
          });
        } else if (descricao.length > 500) {
          errosValidacao.push({
            linha: linhaExcel,
            campo: 'Descrição',
            valorAtual: `${descricao.substring(0, 30)}...`,
            mensagem: `Descrição muito longa (${descricao.length} caracteres). Máximo: 500`,
          });
        }

        // Validar Valor
        const valorRaw = row['Valor'];
        const validacaoValor = validarValor(valorRaw);
        if (!validacaoValor.valido) {
          errosValidacao.push({
            linha: linhaExcel,
            campo: 'Valor',
            valorAtual: String(valorRaw || '(vazio)'),
            mensagem: validacaoValor.mensagem,
          });
        }

        // Validar Data de Vencimento
        const dataVencRaw = row['Data Vencimento (DD/MM/AAAA)'] || row['Data Vencimento'] || '';
        const dataVencimento = parseDate(dataVencRaw);
        if (!dataVencRaw) {
          errosValidacao.push({
            linha: linhaExcel,
            campo: 'Data Vencimento',
            valorAtual: '(vazio)',
            mensagem: 'Campo obrigatório. Use formato DD/MM/AAAA',
          });
        } else if (!dataVencimento) {
          errosValidacao.push({
            linha: linhaExcel,
            campo: 'Data Vencimento',
            valorAtual: String(dataVencRaw),
            mensagem: 'Formato de data inválido. Use DD/MM/AAAA',
          });
        }

        // Validar Data de Competência
        const dataCompRaw = row['Data Competência (DD/MM/AAAA)'] || row['Data Competência'] || '';
        const dataCompetencia = parseDate(dataCompRaw);
        if (!dataCompRaw) {
          errosValidacao.push({
            linha: linhaExcel,
            campo: 'Data Competência',
            valorAtual: '(vazio)',
            mensagem: 'Campo obrigatório. Use formato DD/MM/AAAA',
          });
        } else if (!dataCompetencia) {
          errosValidacao.push({
            linha: linhaExcel,
            campo: 'Data Competência',
            valorAtual: String(dataCompRaw),
            mensagem: 'Formato de data inválido. Use DD/MM/AAAA',
          });
        }

        // Validar CNPJ/CPF
        const cnpjCpfRaw = (row['CNPJ/CPF'] || row['CNPJ'] || row['CPF'] || '').toString().trim();
        const clienteFornecedorNome = (row['Cliente/Fornecedor (Nome Fantasia ou Razão Social)'] || row['Cliente/Fornecedor'] || '').toString().trim();
        
        if (cnpjCpfRaw) {
          const validacaoCnpj = validarCnpjCpf(cnpjCpfRaw);
          if (!validacaoCnpj.valido) {
            errosValidacao.push({
              linha: linhaExcel,
              campo: 'CNPJ/CPF',
              valorAtual: cnpjCpfRaw,
              mensagem: validacaoCnpj.mensagem,
            });
          }
        } else if (!clienteFornecedorNome) {
          // Se não tem CNPJ nem nome, é erro
          errosValidacao.push({
            linha: linhaExcel,
            campo: 'CNPJ/CPF ou Cliente/Fornecedor',
            valorAtual: '(ambos vazios)',
            mensagem: 'Informe CNPJ/CPF ou Nome do Cliente/Fornecedor',
          });
        }
      }

      // Finalizar validação
      setValidationProgress({ current: jsonData.length, total: jsonData.length, phase: 'concluido' });
      
      // Esperar um pouco para mostrar 100%
      await new Promise(resolve => setTimeout(resolve, 800));

      // Se houver erros de formatação, mostrar tela de erros
      if (errosValidacao.length > 0) {
        setValidationErrors(errosValidacao);
        setStep('validation-errors');
        return;
      }

      // Buscar dados para validação de referências
      const [clientesRes, fornecedoresRes, planoContasRes, centrosCustoRes, contasBancariasRes, servicosRes] = await Promise.all([
        supabase.from('clientes').select('id, razao_social, nome_fantasia, cnpj_cpf'),
        supabase.from('fornecedores').select('id, razao_social, nome_fantasia, cnpj_cpf'),
        supabase.from('plano_contas').select('id, codigo, descricao').eq('status', 'ativo'),
        supabase.from('centros_custo').select('id, codigo, descricao').eq('status', 'ativo'),
        supabase.from('contas_bancarias').select('id, descricao, banco').eq('status', 'ativo'),
        supabase.from('servicos').select('id, codigo, nome').eq('status', 'ativo'),
      ]);

      const clientes = clientesRes.data || [];
      const fornecedores = fornecedoresRes.data || [];
      const planoContas = planoContasRes.data || [];
      const centrosCusto = centrosCustoRes.data || [];
      const contasBancarias = contasBancariasRes.data || [];
      const servicos = servicosRes.data || [];

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

        // Datas - guardar valores originais para exibição
        const dataVencRaw = row['Data Vencimento (DD/MM/AAAA)'] || row['Data Vencimento'] || '';
        const dataCompRaw = row['Data Competência (DD/MM/AAAA)'] || row['Data Competência'] || '';
        const dataVencOriginalStr = typeof dataVencRaw === 'number' ? `Serial: ${dataVencRaw}` : String(dataVencRaw);
        const dataCompOriginalStr = typeof dataCompRaw === 'number' ? `Serial: ${dataCompRaw}` : String(dataCompRaw);
        const dataVencimento = parseDate(dataVencRaw);
        const dataCompetencia = parseDate(dataCompRaw);
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

        // Serviço (opcional)
        const servicoCodigo = (row['Serviço (Código)'] || row['Serviço'] || row['Servico'] || '').toString().trim();
        let servico_id: string | undefined;
        let servico_nome: string | undefined;
        if (servicoCodigo) {
          const servico = servicos.find(s => 
            s.codigo.toLowerCase() === servicoCodigo.toLowerCase() ||
            s.nome.toLowerCase() === servicoCodigo.toLowerCase()
          );
          if (servico) {
            servico_id = servico.id;
            servico_nome = servico.nome;
          } else {
            warnings.push(`Serviço "${servicoCodigo}" não encontrado`);
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
          data_vencimento_original: dataVencOriginalStr,
          data_competencia_original: dataCompOriginalStr,
          cliente_fornecedor_nome: nomeEncontrado || clienteFornecedorNome || cnpjCpf,
          plano_conta_codigo: planoContaCodigo,
          centro_custo_codigo: centroCustoCodigo,
          conta_bancaria_nome: contaBancariaNome,
          servico_codigo: servicoCodigo || undefined,
          servico_nome: servico_nome,
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
          servico_id,
        };
      });

      setPreviewData(preview);
      
      toast({
        title: "Validação concluída!",
        description: `${jsonData.length} linha(s) validada(s) com sucesso.`,
      });
      
      setStep('preview');
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: "Verifique se o arquivo está no formato correto (.xlsx ou .xls)",
        variant: "destructive",
      });
      setStep('upload');
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

  // Função para buscar dados do CNPJ via Edge Function (server-side, sem CORS)
  const buscarCnpjSilently = async (cnpj: string): Promise<CnpjApiData | null> => {
    const cnpjLimpo = cnpj.replace(/\D/g, "");
    
    if (cnpjLimpo.length !== 14) {
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('cnpj-lookup', {
        body: null,
        headers: { 'Content-Type': 'application/json' },
      });
      
      // A função usa query params, então vamos usar fetch direto
      const response = await fetch(
        `https://epgifclglrrgzpguqbde.supabase.co/functions/v1/cnpj-lookup?cnpj=${cnpjLimpo}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`Edge Function retornou status ${response.status}`);
        return null;
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return {
          razao_social: result.data.razao_social || "",
          nome_fantasia: result.data.nome_fantasia || "",
          endereco: result.data.endereco || "",
          numero: result.data.numero || "",
          complemento: result.data.complemento || "",
          bairro: result.data.bairro || "",
          cidade: result.data.cidade || "",
          uf: result.data.uf || "",
          cep: result.data.cep || "",
          telefone: result.data.telefone || "",
          email: result.data.email || "",
        };
      }
      
      console.log(`CNPJ ${cnpjLimpo}: ${result.error || 'não encontrado'}`);
      return null;
    } catch (error) {
      console.error(`Erro ao buscar CNPJ ${cnpjLimpo} via Edge Function:`, error);
      return null;
    }
  };

  // Função para buscar múltiplos CNPJs em lote via Edge Function
  const buscarCnpjsEmLote = async (cnpjs: string[]): Promise<Map<string, CnpjApiData | null>> => {
    const resultados = new Map<string, CnpjApiData | null>();
    
    if (cnpjs.length === 0) return resultados;

    try {
      const cnpjsLimpos = cnpjs.map(c => c.replace(/\D/g, "")).filter(c => c.length === 14);
      
      const response = await fetch(
        `https://epgifclglrrgzpguqbde.supabase.co/functions/v1/cnpj-lookup?cnpjs=${cnpjsLimpos.join(',')}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`Edge Function em lote retornou status ${response.status}`);
        return resultados;
      }

      const result = await response.json();
      
      if (result.success && result.results) {
        for (const [cnpj, data] of Object.entries(result.results)) {
          const cnpjResult = data as { success: boolean; data?: CnpjApiData; fromCache?: boolean };
          if (cnpjResult.success && cnpjResult.data) {
            resultados.set(cnpj, {
              razao_social: cnpjResult.data.razao_social || "",
              nome_fantasia: (cnpjResult.data as any).nome_fantasia || "",
              endereco: cnpjResult.data.endereco || "",
              numero: cnpjResult.data.numero || "",
              complemento: cnpjResult.data.complemento || "",
              bairro: cnpjResult.data.bairro || "",
              cidade: cnpjResult.data.cidade || "",
              uf: cnpjResult.data.uf || "",
              cep: cnpjResult.data.cep || "",
              telefone: cnpjResult.data.telefone || "",
              email: cnpjResult.data.email || "",
            });
          } else {
            resultados.set(cnpj, null);
          }
        }
      }
      
      return resultados;
    } catch (error) {
      console.error('Erro ao buscar CNPJs em lote via Edge Function:', error);
      return resultados;
    }
  };

  // Obter lista única de novos cadastros a serem criados
  const getNovosCadastrosUnicos = () => {
    const novos = new Map<string, { cnpj: string; nome: string; tipo: 'cliente' | 'fornecedor' }>();
    previewData.forEach(row => {
      if (row.willCreateClienteFornecedor && row.cnpjCpfParaCriar) {
        const cnpjKey = row.cnpjCpfParaCriar.replace(/[^\d]/g, '');
        if (!novos.has(cnpjKey)) {
          novos.set(cnpjKey, {
            cnpj: row.cnpjCpfParaCriar,
            nome: row.nomeParaCriar || (row.tipo === 'entrada' ? `Cliente ${row.cnpjCpfParaCriar}` : `Fornecedor ${row.cnpjCpfParaCriar}`),
            tipo: row.tipo === 'entrada' ? 'cliente' : 'fornecedor',
          });
        }
      }
    });
    return novos;
  };

  const updateNovoContato = (cnpjKey: string, field: keyof NovosCadastrosContato, value: string | string[] | boolean) => {
    setNovosCadastrosContato(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(cnpjKey) || { emails: [] };
      newMap.set(cnpjKey, { ...current, [field]: value });
      return newMap;
    });
  };

  const addEmail = (cnpjKey: string) => {
    setNovosCadastrosContato(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(cnpjKey) || { emails: [] };
      newMap.set(cnpjKey, { ...current, emails: [...(current.emails || []), ''] });
      return newMap;
    });
  };

  const removeEmail = (cnpjKey: string, emailIndex: number) => {
    setNovosCadastrosContato(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(cnpjKey) || { emails: [] };
      const newEmails = [...(current.emails || [])];
      newEmails.splice(emailIndex, 1);
      newMap.set(cnpjKey, { ...current, emails: newEmails });
      return newMap;
    });
  };

  const updateEmail = (cnpjKey: string, emailIndex: number, value: string) => {
    setNovosCadastrosContato(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(cnpjKey) || { emails: [] };
      const newEmails = [...(current.emails || [])];
      newEmails[emailIndex] = value;
      newMap.set(cnpjKey, { ...current, emails: newEmails });
      return newMap;
    });
  };

  const [loadingCnpjs, setLoadingCnpjs] = useState<Set<string>>(new Set());

  // Função para buscar dados de um CNPJ específico na tela de edição
  const handleBuscarCnpj = async (cnpjKey: string, cnpj: string) => {
    setLoadingCnpjs(prev => new Set(prev).add(cnpjKey));
    
    const dados = await buscarCnpjSilently(cnpj);
    
    if (dados) {
      setNovosCadastrosContato(prev => {
        const newMap = new Map(prev);
        const existing = prev.get(cnpjKey) || { emails: [] };
        // Adicionar email da API ao array de emails, se existir e não estiver vazio
        const emailsAtuais = existing.emails || [];
        const emailsNovos = dados.email && !emailsAtuais.includes(dados.email) 
          ? [...emailsAtuais.filter(e => e), dados.email] 
          : emailsAtuais.filter(e => e);
        newMap.set(cnpjKey, {
          ...existing,
          nomeFantasia: dados.nome_fantasia || existing.nomeFantasia || '',
          emails: emailsNovos.length > 0 ? emailsNovos : [''],
          telefone: dados.telefone || existing.telefone || '',
          endereco: dados.endereco || '',
          numero: dados.numero || '',
          complemento: dados.complemento || '',
          bairro: dados.bairro || '',
          cidade: dados.cidade || '',
          uf: dados.uf || '',
          cep: dados.cep || '',
          apiLoaded: true,
        });
        return newMap;
      });
      toast({
        title: "Dados encontrados!",
        description: `Endereço e contato de ${cnpj} preenchidos automaticamente.`,
      });
    } else {
      toast({
        title: "CNPJ não encontrado",
        description: "Não foi possível buscar os dados deste CNPJ. Preencha manualmente.",
        variant: "destructive",
      });
    }
    
    setLoadingCnpjs(prev => {
      const newSet = new Set(prev);
      newSet.delete(cnpjKey);
      return newSet;
    });
  };

  const handleProceedToEditNovos = async () => {
    const novos = getNovosCadastrosUnicos();
    if (novos.size > 0) {
      // Inicializar o map de contatos para os novos cadastros
      const initialContatos = new Map<string, NovosCadastrosContato>();
      novos.forEach((data, cnpjKey) => {
        initialContatos.set(cnpjKey, {
          nomeFantasia: '',
          emails: [''], // Inicializa com um campo de email vazio
          telefone: '',
          endereco: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          uf: '',
          cep: '',
          apiLoaded: false,
        });
      });
      setNovosCadastrosContato(initialContatos);

      // Buscar dados de CNPJ automaticamente para todos os novos cadastros (apenas CNPJs com 14 dígitos)
      const cnpjsParaBuscar = Array.from(novos.entries()).filter(([cnpjKey]) => cnpjKey.length === 14);
      
      if (cnpjsParaBuscar.length > 0) {
        // Mostrar tela de loading
        setCnpjProgress({ current: 0, total: cnpjsParaBuscar.length, currentCnpj: 'Iniciando busca em lote...' });
        setStep('loading-cnpj');

        // Usar busca em lote via Edge Function (muito mais rápido e sem CORS)
        const cnpjsList = cnpjsParaBuscar.map(([cnpjKey]) => cnpjKey);
        
        // Atualizar progresso para indicar busca em andamento
        setCnpjProgress({ 
          current: 1, 
          total: cnpjsParaBuscar.length, 
          currentCnpj: `Consultando ${cnpjsParaBuscar.length} CNPJ(s) via servidor...`
        });

        const resultadosLote = await buscarCnpjsEmLote(cnpjsList);
        
        // Contar resultados
        let encontrados = 0;
        let naoEncontrados = 0;

        // Atualizar todos os contatos de uma vez
        setNovosCadastrosContato(prev => {
          const newMap = new Map(prev);
          cnpjsParaBuscar.forEach(([cnpjKey]) => {
            const dados = resultadosLote.get(cnpjKey);
            if (dados) {
              encontrados++;
              const current = newMap.get(cnpjKey) || { emails: [] };
              // Adicionar email da API ao array de emails
              const emailsAtuais = current.emails || [];
              const emailsNovos = dados.email && !emailsAtuais.includes(dados.email)
                ? [...emailsAtuais.filter(e => e), dados.email]
                : emailsAtuais.filter(e => e);
              newMap.set(cnpjKey, {
                ...current,
                nomeFantasia: dados.nome_fantasia || current.nomeFantasia || '',
                emails: emailsNovos.length > 0 ? emailsNovos : [''],
                telefone: dados.telefone || current.telefone || '',
                endereco: dados.endereco || '',
                numero: dados.numero || '',
                complemento: dados.complemento || '',
                bairro: dados.bairro || '',
                cidade: dados.cidade || '',
                uf: dados.uf || '',
                cep: dados.cep || '',
                apiLoaded: true,
              });
            } else {
              naoEncontrados++;
            }
          });
          return newMap;
        });

        // Mostrar resultado da busca
        if (naoEncontrados === 0) {
          toast({
            title: "Busca concluída!",
            description: `Dados de ${encontrados} CNPJ(s) carregados automaticamente.`,
          });
        } else if (encontrados > 0) {
          toast({
            title: "Busca parcialmente concluída",
            description: `${encontrados} CNPJ(s) encontrado(s), ${naoEncontrados} não encontrado(s). Complete os dados manualmente.`,
          });
        } else {
          toast({
            title: "Busca sem resultados",
            description: `Não foi possível buscar os dados de ${naoEncontrados} CNPJ(s). Preencha manualmente.`,
            variant: "destructive",
          });
        }

        // Ir para tela de edição após buscar todos
        setStep('edit-novos');
      } else {
        // Não há CNPJs para buscar, ir direto para edição
        setStep('edit-novos');
      }
    } else {
      handleImport();
    }
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
              const contato = novosCadastrosContato.get(cnpjKey) || { emails: [] };
              // Filtrar emails vazios
              const emailsValidos = (contato.emails || []).filter(e => e && e.trim());
              const { data: novoCliente, error } = await supabase
                .from('clientes')
                .insert({
                  cnpj_cpf: formatCnpjCpf(row.cnpjCpfParaCriar),
                  razao_social: row.nomeParaCriar || `Cliente ${row.cnpjCpfParaCriar}`,
                  nome_fantasia: contato.nomeFantasia || null,
                  email: emailsValidos.length > 0 ? emailsValidos : null,
                  telefone: contato.telefone || null,
                  endereco: contato.endereco || null,
                  numero: contato.numero || null,
                  complemento: contato.complemento || null,
                  bairro: contato.bairro || null,
                  cidade: contato.cidade || null,
                  uf: contato.uf || null,
                  cep: contato.cep || null,
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
              const contato = novosCadastrosContato.get(cnpjKey) || { emails: [] };
              // Filtrar emails vazios
              const emailsValidos = (contato.emails || []).filter(e => e && e.trim());
              const { data: novoFornecedor, error } = await supabase
                .from('fornecedores')
                .insert({
                  cnpj_cpf: formatCnpjCpf(row.cnpjCpfParaCriar),
                  razao_social: row.nomeParaCriar || `Fornecedor ${row.cnpjCpfParaCriar}`,
                  nome_fantasia: contato.nomeFantasia || null,
                  email: emailsValidos.length > 0 ? emailsValidos : null,
                  telefone: contato.telefone || null,
                  endereco: contato.endereco || null,
                  numero: contato.numero || null,
                  complemento: contato.complemento || null,
                  bairro: contato.bairro || null,
                  cidade: contato.cidade || null,
                  uf: contato.uf || null,
                  cep: contato.cep || null,
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

        // Montar observações com serviço se informado
        const observacoes = row.servico_nome ? `Serviço: ${row.servico_nome}` : null;

        if (row.tipo === 'entrada') {
          // Verificar se temos cliente_id válido antes de inserir
          if (!clienteId) {
            console.error('Erro: cliente_id não definido para lançamento de entrada', row);
            throw new Error(`Cliente não encontrado ou não foi possível criar para: ${row.descricao}`);
          }
          const { error } = await supabase.from('contas_receber').insert({
            cliente_id: clienteId,
            descricao: row.descricao,
            valor: row.valor,
            data_vencimento: row.data_vencimento,
            data_competencia: row.data_competencia,
            plano_conta_id: row.plano_conta_id || null,
            centro_custo: row.centro_custo || null,
            conta_bancaria_id: row.conta_bancaria_id || null,
            observacoes,
            status: 'pendente',
          });
          if (error) throw error;
        } else {
          // Verificar se temos fornecedor_id válido antes de inserir
          if (!fornecedorId) {
            console.error('Erro: fornecedor_id não definido para lançamento de saída', row);
            throw new Error(`Fornecedor não encontrado ou não foi possível criar para: ${row.descricao}`);
          }
          const { error } = await supabase.from('contas_pagar').insert({
            fornecedor_id: fornecedorId,
            descricao: row.descricao,
            valor: row.valor,
            data_vencimento: row.data_vencimento,
            data_competencia: row.data_competencia,
            plano_conta_id: row.plano_conta_id || null,
            centro_custo: row.centro_custo || null,
            conta_bancaria_id: row.conta_bancaria_id || null,
            observacoes,
            status: 'pendente',
          });
          if (error) throw error;
        }
        successCount++;
      } catch (error: any) {
        console.error('Erro ao importar linha:', {
          descricao: row.descricao,
          tipo: row.tipo,
          cliente_id: row.cliente_id,
          fornecedor_id: row.fornecedor_id,
          willCreate: row.willCreateClienteFornecedor,
          cnpjParaCriar: row.cnpjCpfParaCriar,
          error: error?.message || error
        });
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
    if (!importing && step !== 'loading-cnpj' && step !== 'validating') {
      onOpenChange(false);
      setStep('upload');
      setPreviewData([]);
      setNovosCadastrosContato(new Map());
      setCnpjProgress({ current: 0, total: 0, currentCnpj: '' });
      setValidationProgress({ current: 0, total: 0, phase: 'lendo' });
      setValidationErrors([]);
    }
  };

  const handleBackToUpload = () => {
    setStep('upload');
    setPreviewData([]);
    setValidationErrors([]);
    setValidationProgress({ current: 0, total: 0, phase: 'lendo' });
    // Limpar input de arquivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = previewData.filter(r => r.valid).length;
  const invalidCount = previewData.filter(r => !r.valid).length;
  
  // Contar cadastros únicos (não duplicados)
  const cadastrosUnicos = getNovosCadastrosUnicos();
  const totalLinhasComNovoCadastro = previewData.filter(r => r.willCreateClienteFornecedor).length;

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

        {step === 'validating' && (
          <div className="space-y-6 py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
              <p className="text-lg font-medium">
                {validationProgress.phase === 'lendo' && 'Lendo planilha...'}
                {validationProgress.phase === 'validando' && 'Validando dados da planilha...'}
                {validationProgress.phase === 'concluido' && 'Validação concluída!'}
              </p>
              <p className="text-muted-foreground mt-1">
                {validationProgress.phase === 'lendo' && 'Processando arquivo Excel'}
                {validationProgress.phase === 'validando' && 'Verificando formato de todos os campos'}
                {validationProgress.phase === 'concluido' && 'Preparando próxima etapa...'}
              </p>
            </div>
            
            {validationProgress.total > 0 && (
              <div className="max-w-md mx-auto space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{validationProgress.current} de {validationProgress.total} linhas</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div 
                    className="bg-primary h-3 rounded-full transition-all duration-300"
                    style={{ width: `${validationProgress.total > 0 ? (validationProgress.current / validationProgress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Verificando: Tipo, Descrição, Valor, Datas e CNPJ/CPF
            </p>
          </div>
        )}

        {step === 'validation-errors' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div>
                <p className="font-medium text-destructive">Erros de formatação encontrados</p>
                <p className="text-sm text-muted-foreground">
                  Foram encontrados {validationErrors.length} erro(s) na planilha. 
                  Corrija os dados apontados abaixo e faça o upload novamente.
                </p>
              </div>
            </div>

            <div className="border rounded-lg max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Linha</TableHead>
                    <TableHead className="w-[150px]">Campo</TableHead>
                    <TableHead className="w-[180px]">Valor Atual</TableHead>
                    <TableHead>Problema</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationErrors.map((erro, index) => (
                    <TableRow key={index} className="bg-destructive/5">
                      <TableCell className="font-mono font-medium">{erro.linha}</TableCell>
                      <TableCell className="font-medium text-destructive">{erro.campo}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground max-w-[180px] truncate" title={erro.valorAtual}>
                        {erro.valorAtual}
                      </TableCell>
                      <TableCell className="text-sm">{erro.mensagem}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Como corrigir:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Abra a planilha e localize as linhas indicadas</li>
                <li>Corrija os valores conforme as mensagens de erro</li>
                <li>Certifique-se que as datas estão no formato DD/MM/AAAA</li>
                <li>CNPJ deve ter 14 dígitos e CPF deve ter 11 dígitos</li>
                <li>Salve a planilha e faça o upload novamente</li>
              </ul>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleBackToUpload}>
                <Upload className="w-4 h-4 mr-2" />
                Fazer Novo Upload
              </Button>
            </DialogFooter>
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
              {cadastrosUnicos.size > 0 && (
                <Badge variant="outline" className="gap-1 border-primary text-primary">
                  <UserPlus className="w-3 h-3" />
                  {cadastrosUnicos.size} cadastro(s) novo(s)
                  {totalLinhasComNovoCadastro > cadastrosUnicos.size && (
                    <span className="text-xs ml-1">
                      ({totalLinhasComNovoCadastro} lançamentos)
                    </span>
                  )}
                </Badge>
              )}
            </div>

            {totalLinhasComNovoCadastro > cadastrosUnicos.size && (
              <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-primary">CNPJs duplicados detectados:</span>
                  <span className="text-muted-foreground ml-1">
                    {totalLinhasComNovoCadastro} lançamentos usam {cadastrosUnicos.size} CNPJ(s) não cadastrado(s).
                    Será criado apenas 1 cadastro por CNPJ, vinculado a todos os lançamentos correspondentes.
                  </span>
                </div>
              </div>
            )}

            <div className="border rounded-lg max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Competência</TableHead>
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
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={row.data_vencimento ? 'text-foreground font-medium' : 'text-destructive'}>
                            {row.data_vencimento ? format(new Date(row.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy') : 'Inválida'}
                          </span>
                          {row.data_vencimento_original?.startsWith('Serial:') && (
                            <span className="text-xs text-muted-foreground">
                              ({row.data_vencimento_original})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={row.data_competencia ? 'text-foreground' : 'text-destructive'}>
                            {row.data_competencia ? format(new Date(row.data_competencia + 'T00:00:00'), 'dd/MM/yyyy') : 'Inválida'}
                          </span>
                          {row.data_competencia_original?.startsWith('Serial:') && (
                            <span className="text-xs text-muted-foreground">
                              ({row.data_competencia_original})
                            </span>
                          )}
                        </div>
                      </TableCell>
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
              {previewData.some(r => r.willCreateClienteFornecedor) ? (
                <Button onClick={handleProceedToEditNovos} disabled={validCount === 0}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Revisar Novos Cadastros ({getNovosCadastrosUnicos().size})
                </Button>
              ) : (
                <Button onClick={handleImport} disabled={validCount === 0}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar {validCount} Lançamento(s)
                </Button>
              )}
            </DialogFooter>
          </div>
        )}

        {step === 'loading-cnpj' && (
          <div className="space-y-6 py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
              <p className="text-lg font-medium">Consultando CNPJs na Receita Federal...</p>
              <p className="text-muted-foreground mt-1">
                Buscando dados de endereço e contato automaticamente
              </p>
            </div>
            
            <div className="max-w-md mx-auto space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{cnpjProgress.current} de {cnpjProgress.total}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div 
                  className="bg-primary h-3 rounded-full transition-all duration-300"
                  style={{ width: `${cnpjProgress.total > 0 ? (cnpjProgress.current / cnpjProgress.total) * 100 : 0}%` }}
                />
              </div>
              {cnpjProgress.currentCnpj && (
                <p className="text-center text-sm text-muted-foreground">
                  Consultando: <span className="font-mono">{cnpjProgress.currentCnpj}</span>
                </p>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Aguarde enquanto buscamos os dados. Isso pode levar alguns segundos por CNPJ.
            </p>
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

        {step === 'edit-novos' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <UserPlus className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Novos Cadastros</p>
                <p className="text-xs text-muted-foreground">
                  Os dados de endereço e contato são buscados automaticamente via CNPJ. Revise e complete as informações se necessário.
                </p>
              </div>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-auto">
              {Array.from(getNovosCadastrosUnicos()).map(([cnpjKey, data]) => {
                const contato = novosCadastrosContato.get(cnpjKey) || { emails: [] };
                const isLoading = loadingCnpjs.has(cnpjKey);
                const emails = contato.emails || [''];
                return (
                  <div key={cnpjKey} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant={data.tipo === 'cliente' ? 'default' : 'secondary'} className="mb-1">
                          {data.tipo === 'cliente' ? 'Novo Cliente' : 'Novo Fornecedor'}
                        </Badge>
                        <p className="font-medium">{data.nome}</p>
                        <p className="text-sm text-muted-foreground">CNPJ/CPF: {formatCnpjCpf(data.cnpj)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {contato.apiLoaded && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Dados carregados
                          </Badge>
                        )}
                        {cnpjKey.length === 14 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBuscarCnpj(cnpjKey, data.cnpj)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Buscando...
                              </>
                            ) : (
                              <>
                                <Pencil className="w-3 h-3 mr-1" />
                                Buscar CNPJ
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Dados Básicos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`nome-fantasia-${cnpjKey}`} className="text-xs">
                          Nome Fantasia
                        </Label>
                        <Input
                          id={`nome-fantasia-${cnpjKey}`}
                          placeholder="Nome fantasia (opcional)"
                          value={contato.nomeFantasia || ''}
                          onChange={(e) => updateNovoContato(cnpjKey, 'nomeFantasia', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`telefone-${cnpjKey}`} className="text-xs flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          Telefone
                        </Label>
                        <Input
                          id={`telefone-${cnpjKey}`}
                          placeholder="(00) 00000-0000"
                          value={contato.telefone || ''}
                          onChange={(e) => updateNovoContato(cnpjKey, 'telefone', e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* E-mails - Múltiplos */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          E-mails (para notificações)
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addEmail(cnpjKey)}
                          className="h-7 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Adicionar e-mail
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {emails.map((email, emailIndex) => (
                          <div key={emailIndex} className="flex items-center gap-2">
                            <Input
                              type="email"
                              placeholder="email@exemplo.com"
                              value={email}
                              onChange={(e) => updateEmail(cnpjKey, emailIndex, e.target.value)}
                              className="h-9"
                            />
                            {emails.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeEmail(cnpjKey, emailIndex)}
                                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Adicione todos os e-mails que devem receber notificações de cobrança e faturamento.
                      </p>
                    </div>

                    {/* Endereço */}
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Endereço</p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2 space-y-1.5">
                          <Label htmlFor={`endereco-${cnpjKey}`} className="text-xs">Logradouro</Label>
                          <Input
                            id={`endereco-${cnpjKey}`}
                            placeholder="Rua, Avenida..."
                            value={contato.endereco || ''}
                            onChange={(e) => updateNovoContato(cnpjKey, 'endereco', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`numero-${cnpjKey}`} className="text-xs">Número</Label>
                          <Input
                            id={`numero-${cnpjKey}`}
                            placeholder="Nº"
                            value={contato.numero || ''}
                            onChange={(e) => updateNovoContato(cnpjKey, 'numero', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`complemento-${cnpjKey}`} className="text-xs">Complemento</Label>
                          <Input
                            id={`complemento-${cnpjKey}`}
                            placeholder="Apto, Sala..."
                            value={contato.complemento || ''}
                            onChange={(e) => updateNovoContato(cnpjKey, 'complemento', e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div className="space-y-1.5">
                          <Label htmlFor={`bairro-${cnpjKey}`} className="text-xs">Bairro</Label>
                          <Input
                            id={`bairro-${cnpjKey}`}
                            placeholder="Bairro"
                            value={contato.bairro || ''}
                            onChange={(e) => updateNovoContato(cnpjKey, 'bairro', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`cidade-${cnpjKey}`} className="text-xs">Cidade</Label>
                          <Input
                            id={`cidade-${cnpjKey}`}
                            placeholder="Cidade"
                            value={contato.cidade || ''}
                            onChange={(e) => updateNovoContato(cnpjKey, 'cidade', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`uf-${cnpjKey}`} className="text-xs">UF</Label>
                          <Input
                            id={`uf-${cnpjKey}`}
                            placeholder="SP"
                            maxLength={2}
                            value={contato.uf || ''}
                            onChange={(e) => updateNovoContato(cnpjKey, 'uf', e.target.value.toUpperCase())}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`cep-${cnpjKey}`} className="text-xs">CEP</Label>
                          <Input
                            id={`cep-${cnpjKey}`}
                            placeholder="00000-000"
                            value={contato.cep || ''}
                            onChange={(e) => updateNovoContato(cnpjKey, 'cep', e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('preview')}>
                Voltar
              </Button>
              <Button onClick={handleImport}>
                <Upload className="w-4 h-4 mr-2" />
                Importar {validCount} Lançamento(s)
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
