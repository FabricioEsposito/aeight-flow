import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportColumn {
  header: string;
  accessor: string | ((row: any) => string | number);
  type?: 'text' | 'number' | 'date' | 'currency';
}

interface ExportOptions {
  title: string;
  filename: string;
  columns: ExportColumn[];
  data: any[];
  dateRange?: string;
}

export const useExportReport = () => {
  const { toast } = useToast();

  const formatValue = (row: any, column: ExportColumn, forPdf = false) => {
    const rawValue = typeof column.accessor === 'function' ? column.accessor(row) : row[column.accessor] ?? '';
    
    // Para PDF, formatar valores para exibição
    if (forPdf) {
      if (column.type === 'currency') {
        const num = typeof rawValue === 'number' ? rawValue : parseNumericValue(rawValue);
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
      }
      if (column.type === 'date') {
        if (!rawValue) return '-';
        const date = typeof rawValue === 'string' ? parseDateValue(rawValue) : rawValue;
        return date ? date.toLocaleDateString('pt-BR') : '-';
      }
    }
    
    return rawValue;
  };

  const parseNumericValue = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    // Remove R$, espaços e converte vírgula para ponto
    const cleaned = String(value).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parseDateValue = (value: string): Date | null => {
    if (!value) return null;
    // Tenta parse de formato DD/MM/YYYY
    const parts = value.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    // Tenta parse de formato ISO
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  };

  const exportToPDF = ({ title, filename, columns, data, dateRange }: ExportOptions) => {
    try {
      // Orientação paisagem para melhor visualização
      const doc = new jsPDF('landscape');
      
      // Título
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      
      // Período
      if (dateRange) {
        doc.setFontSize(10);
        doc.text(`Período: ${dateRange}`, 14, 30);
      }
      
      // Data de geração
      doc.setFontSize(8);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 36);
      
      // Tabela
      const tableData = data.map(row => 
        columns.map(col => formatValue(row, col, true))
      );
      
      autoTable(doc, {
        head: [columns.map(col => col.header)],
        body: tableData,
        startY: 42,
        styles: { 
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: { 
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: { 
          fillColor: [245, 245, 245] 
        },
      });
      
      doc.save(`${filename}.pdf`);
      
      toast({
        title: "Sucesso",
        description: "Relatório PDF exportado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível exportar o relatório PDF.",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = ({ title, filename, columns, data, dateRange }: ExportOptions) => {
    try {
      // Preparar dados com tipos corretos
      const worksheetData = data.map(row => {
        const rowData: Record<string, any> = {};
        columns.forEach(col => {
          const rawValue = formatValue(row, col, false);
          
          // Formatar valor baseado no tipo
          if (col.type === 'currency' || col.type === 'number') {
            rowData[col.header] = parseNumericValue(rawValue);
          } else if (col.type === 'date') {
            const dateVal = parseDateValue(String(rawValue));
            rowData[col.header] = dateVal || rawValue;
          } else {
            rowData[col.header] = rawValue;
          }
        });
        return rowData;
      });
      
      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(worksheetData);
      
      // Ajustar largura das colunas
      const colWidths = columns.map(col => ({
        wch: Math.max(col.header.length + 2, 15)
      }));
      ws['!cols'] = colWidths;

      // Aplicar formato numérico com separador de milhares para colunas de moeda
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; C++) {
        const colType = columns[C]?.type;
        for (let R = range.s.r + 1; R <= range.e.r; R++) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[cellRef];
          if (cell) {
            if (colType === 'currency' || colType === 'number') {
              cell.t = 'n'; // tipo numérico
              cell.z = '#,##0.00'; // formato com separador de milhares
            } else if (colType === 'date' && cell.v instanceof Date) {
              cell.t = 'd'; // tipo data
              cell.z = 'dd/mm/yyyy'; // formato data abreviada
            }
          }
        }
      }
      
      XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
      
      // Exportar
      XLSX.writeFile(wb, `${filename}.xls`);
      
      toast({
        title: "Sucesso",
        description: "Relatório Excel exportado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast({
        title: "Erro",
        description: "Não foi possível exportar o relatório Excel.",
        variant: "destructive",
      });
    }
  };

  return { exportToPDF, exportToExcel };
};
