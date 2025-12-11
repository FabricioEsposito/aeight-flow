import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportColumn {
  header: string;
  accessor: string | ((row: any) => string | number);
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

  const formatValue = (row: any, accessor: string | ((row: any) => string | number)) => {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    return row[accessor] ?? '';
  };

  const exportToPDF = ({ title, filename, columns, data, dateRange }: ExportOptions) => {
    try {
      const doc = new jsPDF();
      
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
        columns.map(col => formatValue(row, col.accessor))
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
      // Preparar dados
      const worksheetData = data.map(row => {
        const rowData: Record<string, any> = {};
        columns.forEach(col => {
          rowData[col.header] = formatValue(row, col.accessor);
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
      
      XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31)); // Excel limita nome da aba em 31 chars
      
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
