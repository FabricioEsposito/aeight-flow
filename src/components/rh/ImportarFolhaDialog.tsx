import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { format, parse, isValid } from 'date-fns';
import type { FolhaParcelaRecord } from './FolhaPagamentoTab';

interface ImportarFolhaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  records: FolhaParcelaRecord[];
}

interface PreviewRow {
  rowIndex: number;
  cnpj: string;
  competencia: string;
  categoria: string;
  razaoSocial: string;
  nomeFantasia: string;
  centroCusto: string;
  // Current values
  currentDataVencimento: string;
  currentSalarioBase: number;
  currentValorLiquido: number;
  // New values from spreadsheet
  newDataVencimento: string | null;
  newSalarioBase: number | null;
  newValorLiquido: number | null;
  // Matched record
  matchedRecord: FolhaParcelaRecord | null;
  valid: boolean;
  errors: string[];
  hasChanges: boolean;
}

export function ImportarFolhaDialog({ open, onOpenChange, onSuccess, records }: ImportarFolhaDialogProps) {
  const [step, setStep] = useState<'download' | 'upload' | 'preview' | 'importing'>('download');
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, success: 0, errors: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setStep('download');
    setPreviewData([]);
    setImportProgress({ current: 0, total: 0, success: 0, errors: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const downloadTemplate = () => {
    if (records.length === 0) {
      toast({ title: 'Sem dados', description: 'Nenhum registro no período para gerar template.', variant: 'destructive' });
      return;
    }

    const templateData = records.map(r => {
      const vencDate = new Date(r.data_vencimento + 'T00:00:00');
      const competencia = `${String(vencDate.getMonth() + 1).padStart(2, '0')}/${vencDate.getFullYear()}`;

      const ccMap: Record<string, number> = {};
      r.centros_custo.forEach(cc => { ccMap[cc.codigo] = cc.percentual; });

      return {
        'Competência (MM/AAAA)': competencia,
        'Data Vencimento (DD/MM/AAAA)': format(vencDate, 'dd/MM/yyyy'),
        'Razão Social': r.fornecedor_razao_social,
        'Nome Fantasia': r.fornecedor_nome_fantasia || '',
        'CNPJ/CPF': r.fornecedor_cnpj,
        'Categoria': r.plano_contas_descricao,
        '001_b8one (%)': ccMap['001'] || '',
        '002_Lomadee (%)': ccMap['002'] || '',
        '003_Cryah (%)': ccMap['003'] || '',
        '004_SAIO (%)': ccMap['004'] || '',
        'Salário Base': '',
        'Valor Líquido': '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Folha de Pagamento');

    // Instructions sheet
    const instrucoes = [
      { 'Instruções de Preenchimento': '📋 COMO PREENCHER A PLANILHA DE FOLHA DE PAGAMENTO' },
      { 'Instruções de Preenchimento': '' },
      { 'Instruções de Preenchimento': '1. As colunas Competência, Razão Social, Nome Fantasia, CNPJ/CPF, Categoria e Centro de Custo são apenas para identificação.' },
      { 'Instruções de Preenchimento': '2. NÃO altere os valores dessas colunas, pois são usadas para localizar o registro correto.' },
      { 'Instruções de Preenchimento': '' },
      { 'Instruções de Preenchimento': '3. COLUNAS EDITÁVEIS:' },
      { 'Instruções de Preenchimento': '   - Data Vencimento: Formato DD/MM/AAAA. Pode ser alterada se necessário.' },
      { 'Instruções de Preenchimento': '   - Salário Base: Valor numérico (ex: 5000.00 ou 5000,00).' },
      { 'Instruções de Preenchimento': '   - Valor Líquido: Valor numérico (ex: 4200.00 ou 4200,00).' },
      { 'Instruções de Preenchimento': '' },
      { 'Instruções de Preenchimento': '4. Deixe as colunas Salário Base e Valor Líquido em branco para linhas que não deseja atualizar.' },
      { 'Instruções de Preenchimento': '5. A identificação do registro é feita por CNPJ/CPF + Competência + Categoria.' },
      { 'Instruções de Preenchimento': '' },
      { 'Instruções de Preenchimento': '6. PROPAGAÇÃO: Ao confirmar, o sistema atualiza automaticamente:' },
      { 'Instruções de Preenchimento': '   - folha_pagamento (salário base e valor líquido)' },
      { 'Instruções de Preenchimento': '   - parcelas_contrato (valor e data de vencimento)' },
      { 'Instruções de Preenchimento': '   - contas_pagar (valor, data de vencimento e competência)' },
    ];
    const wsInstr = XLSX.utils.json_to_sheet(instrucoes);
    wsInstr['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instruções');

    // Column widths
    ws['!cols'] = [
      { wch: 18 }, { wch: 22 }, { wch: 35 }, { wch: 25 },
      { wch: 22 }, { wch: 35 }, { wch: 35 }, { wch: 15 }, { wch: 15 },
    ];

    XLSX.writeFile(wb, `folha_pagamento_template.xlsx`);
    toast({ title: 'Download iniciado', description: 'Template baixado com dados preenchidos.' });
  };

  const parseDate = (dateValue: any): string | null => {
    if (!dateValue && dateValue !== 0) return null;
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const jsDate = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
      if (isValid(jsDate) && jsDate.getFullYear() >= 1970 && jsDate.getFullYear() <= 2100) {
        return format(jsDate, 'yyyy-MM-dd');
      }
      return null;
    }
    const dateStr = String(dateValue).trim();
    if (!dateStr) return null;
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
    const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'd/M/yyyy'];
    for (const fmt of formats) {
      try {
        const parsed = parse(dateStr, fmt, new Date());
        if (isValid(parsed) && parsed.getFullYear() >= 1970 && parsed.getFullYear() <= 2100) {
          return format(parsed, 'yyyy-MM-dd');
        }
      } catch { continue; }
    }
    return null;
  };

  const parseValue = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return val > 0 ? val : null;
    const cleaned = String(val).replace(/[^\d,.-]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return !isNaN(num) && num > 0 ? num : null;
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
        toast({ title: 'Arquivo vazio', description: 'A planilha não contém dados.', variant: 'destructive' });
        return;
      }

      const preview: PreviewRow[] = jsonData.map((row: any, index: number) => {
        const errors: string[] = [];

        const cnpj = String(row['CNPJ/CPF'] || '').replace(/\D/g, '');
        const competenciaRaw = String(row['Competência (MM/AAAA)'] || row['Competencia (MM/AAAA)'] || '').trim();
        const categoriaRaw = String(row['Categoria'] || '').trim();
        const razaoSocial = String(row['Razão Social'] || row['Razao Social'] || '').trim();
        const nomeFantasia = String(row['Nome Fantasia'] || '').trim();
        const centroCusto = String(row['Centro de Custo'] || '').trim();

        // Parse competencia MM/YYYY
        const compMatch = competenciaRaw.match(/^(\d{1,2})\/(\d{4})$/);
        let compMes = 0, compAno = 0;
        if (compMatch) {
          compMes = parseInt(compMatch[1], 10);
          compAno = parseInt(compMatch[2], 10);
        }

        // Parse editable fields
        const dataVencRaw = row['Data Vencimento (DD/MM/AAAA)'] || row['Data Vencimento'];
        const newDataVencimento = parseDate(dataVencRaw);
        const newSalarioBase = parseValue(row['Salário Base'] || row['Salario Base']);
        const newValorLiquido = parseValue(row['Valor Líquido'] || row['Valor Liquido']);

        // Match record
        const matched = records.find(r => {
          const rCnpj = r.fornecedor_cnpj.replace(/\D/g, '');
          const rVencDate = new Date(r.data_vencimento + 'T00:00:00');
          const rMes = rVencDate.getMonth() + 1;
          const rAno = rVencDate.getFullYear();
          const rCat = r.plano_contas_descricao;
          return rCnpj === cnpj && rMes === compMes && rAno === compAno && rCat === categoriaRaw;
        });

        if (!matched) {
          errors.push(`Registro não encontrado para CNPJ ${cnpj}, competência ${competenciaRaw}, categoria "${categoriaRaw}"`);
        }

        if (newSalarioBase !== null && newSalarioBase <= 0) errors.push('Salário Base deve ser > 0');
        if (newValorLiquido !== null && newValorLiquido <= 0) errors.push('Valor Líquido deve ser > 0');
        if (dataVencRaw && !newDataVencimento) errors.push('Data Vencimento com formato inválido');

        const hasChanges = newSalarioBase !== null || newValorLiquido !== null ||
          (newDataVencimento !== null && matched && newDataVencimento !== matched.data_vencimento);

        return {
          rowIndex: index + 2,
          cnpj,
          competencia: competenciaRaw,
          categoria: categoriaRaw,
          razaoSocial,
          nomeFantasia,
          centroCusto,
          currentDataVencimento: matched?.data_vencimento || '',
          currentSalarioBase: matched?.salario_base || 0,
          currentValorLiquido: matched?.valor_liquido || 0,
          newDataVencimento,
          newSalarioBase,
          newValorLiquido,
          matchedRecord: matched || null,
          valid: errors.length === 0 && hasChanges,
          errors,
          hasChanges,
        };
      });

      setPreviewData(preview);
      setStep('preview');
    } catch (error) {
      console.error('Erro ao ler planilha:', error);
      toast({ title: 'Erro', description: 'Não foi possível ler o arquivo.', variant: 'destructive' });
    }
  };

  const handleImport = async () => {
    const rowsToImport = previewData.filter(r => r.valid && r.hasChanges && r.matchedRecord);
    if (rowsToImport.length === 0) return;

    setStep('importing');
    setImportProgress({ current: 0, total: rowsToImport.length, success: 0, errors: 0 });

    let success = 0, errorCount = 0;

    for (let i = 0; i < rowsToImport.length; i++) {
      const row = rowsToImport[i];
      const rec = row.matchedRecord!;

      try {
        const salarioBase = row.newSalarioBase ?? rec.salario_base;
        const valorLiquido = row.newValorLiquido ?? rec.valor_liquido;
        const dataVencimento = row.newDataVencimento ?? rec.data_vencimento;
        const vencDate = new Date(dataVencimento + 'T00:00:00');
        const mesRef = vencDate.getMonth() + 1;
        const anoRef = vencDate.getFullYear();

        // 1. Upsert folha_pagamento
        if (rec.folha_id) {
          await supabase.from('folha_pagamento').update({
            salario_base: salarioBase,
            valor_liquido: valorLiquido,
            mes_referencia: mesRef,
            ano_referencia: anoRef,
          }).eq('id', rec.folha_id);
        } else {
          await supabase.from('folha_pagamento').insert({
            parcela_id: rec.parcela_id,
            contrato_id: rec.contrato_id,
            fornecedor_id: rec.fornecedor_id,
            mes_referencia: mesRef,
            ano_referencia: anoRef,
            salario_base: salarioBase,
            valor_liquido: valorLiquido,
            tipo_vinculo: rec.tipo_vinculo,
            status: 'pendente',
            conta_pagar_id: rec.conta_pagar_id,
          });
        }

        // 2. Update parcelas_contrato
        await supabase.from('parcelas_contrato').update({
          valor: valorLiquido,
          data_vencimento: dataVencimento,
        }).eq('id', rec.parcela_id);

        // 3. Update contas_pagar
        if (rec.conta_pagar_id) {
          await supabase.from('contas_pagar').update({
            valor: valorLiquido,
            data_vencimento: dataVencimento,
            data_competencia: dataVencimento,
          }).eq('id', rec.conta_pagar_id);
        }

        success++;
      } catch (error) {
        console.error(`Erro ao importar linha ${row.rowIndex}:`, error);
        errorCount++;
      }

      setImportProgress({ current: i + 1, total: rowsToImport.length, success, errors: errorCount });
    }

    toast({
      title: 'Importação concluída',
      description: `${success} registro(s) atualizado(s)${errorCount > 0 ? `, ${errorCount} erro(s)` : ''}.`,
      variant: errorCount > 0 ? 'destructive' : 'default',
    });

    onSuccess();
    handleOpenChange(false);
  };

  const formatDateStr = (date: string | null) => {
    if (!date) return '-';
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y}`;
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const validRows = previewData.filter(r => r.valid && r.hasChanges);
  const errorRows = previewData.filter(r => r.errors.length > 0);
  const unchangedRows = previewData.filter(r => r.errors.length === 0 && !r.hasChanges);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Folha de Pagamento via Planilha
          </DialogTitle>
          <DialogDescription>
            {step === 'download' && 'Baixe o template preenchido, preencha os valores e faça o upload.'}
            {step === 'upload' && 'Selecione o arquivo preenchido para validação.'}
            {step === 'preview' && 'Confira as alterações antes de confirmar.'}
            {step === 'importing' && 'Importando dados...'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Download template */}
        {step === 'download' && (
          <div className="space-y-6 py-4">
            <div className="border rounded-lg p-6 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Download className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">1. Baixe o Template</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  O template já vem preenchido com os dados do período atual ({records.length} registros).
                  Você precisa preencher apenas as colunas <strong>Salário Base</strong> e <strong>Valor Líquido</strong>.
                  A <strong>Data Vencimento</strong> também pode ser editada.
                </p>
              </div>
              <Button onClick={downloadTemplate} className="gap-2">
                <Download className="w-4 h-4" />
                Baixar Template Preenchido
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
              <Button onClick={() => setStep('upload')}>Próximo: Upload</Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Upload */}
        {step === 'upload' && (
          <div className="space-y-6 py-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center space-y-4 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">2. Faça o Upload</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Selecione o arquivo Excel (.xlsx) preenchido
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Selecionar Arquivo
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('download')}>Voltar</Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <div className="space-y-4 py-4">
            <div className="flex gap-3 flex-wrap">
              {validRows.length > 0 && (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {validRows.length} com alterações
                </Badge>
              )}
              {errorRows.length > 0 && (
                <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {errorRows.length} com erros
                </Badge>
              )}
              {unchangedRows.length > 0 && (
                <Badge variant="secondary">
                  {unchangedRows.length} sem alterações
                </Badge>
              )}
            </div>

            <div className="border rounded-lg overflow-auto max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Linha</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                    <TableHead>Competência</TableHead>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>Data Venc.</TableHead>
                    <TableHead className="text-right">Salário Base</TableHead>
                    <TableHead className="text-right">Valor Líquido</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, idx) => (
                    <TableRow key={idx} className={row.errors.length > 0 ? 'bg-red-50 dark:bg-red-950/20' : row.hasChanges ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                      <TableCell className="text-xs">{row.rowIndex}</TableCell>
                      <TableCell className="text-xs font-mono">{row.cnpj}</TableCell>
                      <TableCell className="text-xs">{row.competencia}</TableCell>
                      <TableCell className="text-xs">{row.razaoSocial}</TableCell>
                      <TableCell className="text-xs">
                        {row.newDataVencimento && row.newDataVencimento !== row.currentDataVencimento ? (
                          <span>
                            <span className="line-through text-muted-foreground">{formatDateStr(row.currentDataVencimento)}</span>
                            {' → '}
                            <span className="font-semibold text-primary">{formatDateStr(row.newDataVencimento)}</span>
                          </span>
                        ) : (
                          formatDateStr(row.currentDataVencimento || row.newDataVencimento)
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {row.newSalarioBase !== null ? (
                          <span>
                            <span className="line-through text-muted-foreground">{formatCurrency(row.currentSalarioBase)}</span>
                            {' → '}
                            <span className="font-semibold text-primary">{formatCurrency(row.newSalarioBase)}</span>
                          </span>
                        ) : (
                          formatCurrency(row.currentSalarioBase)
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {row.newValorLiquido !== null ? (
                          <span>
                            <span className="line-through text-muted-foreground">{formatCurrency(row.currentValorLiquido)}</span>
                            {' → '}
                            <span className="font-semibold text-primary">{formatCurrency(row.newValorLiquido)}</span>
                          </span>
                        ) : (
                          formatCurrency(row.currentValorLiquido)
                        )}
                      </TableCell>
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <div className="space-y-1">
                            {row.errors.map((e, i) => (
                              <Badge key={i} variant="destructive" className="text-xs block w-fit">{e}</Badge>
                            ))}
                          </div>
                        ) : row.hasChanges ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Alterado</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Sem alteração</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setStep('upload'); setPreviewData([]); }}>Voltar</Button>
              <Button onClick={handleImport} disabled={validRows.length === 0} className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Confirmar Importação ({validRows.length} registros)
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className="space-y-6 py-8">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
              <div>
                <h3 className="font-semibold text-lg">Importando dados...</h3>
                <p className="text-sm text-muted-foreground">
                  {importProgress.current} de {importProgress.total} registros processados
                </p>
              </div>
              <Progress value={(importProgress.current / importProgress.total) * 100} className="max-w-md mx-auto" />
              <div className="flex justify-center gap-4 text-sm">
                <span className="text-green-600">✓ {importProgress.success} sucesso</span>
                {importProgress.errors > 0 && <span className="text-red-600">✗ {importProgress.errors} erros</span>}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
