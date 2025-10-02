import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Parcela {
  numero: number;
  data: Date;
  valor: number;
}

interface PreviewParcelasProps {
  parcelas: Parcela[];
}

export function PreviewParcelas({ parcelas }: PreviewParcelasProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const totalParcelas = parcelas.reduce((sum, p) => sum + p.valor, 0);

  if (parcelas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preview de Parcelas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Configure o contrato para visualizar as parcelas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview de Parcelas ({parcelas.length} parcela{parcelas.length > 1 ? 's' : ''})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Parcela</TableHead>
                <TableHead>Data Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((parcela) => (
                <TableRow key={parcela.numero}>
                  <TableCell className="font-medium">{parcela.numero}/{parcelas.length}</TableCell>
                  <TableCell>{format(parcela.data, 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="text-right">{formatCurrency(parcela.valor)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right">{formatCurrency(totalParcelas)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
