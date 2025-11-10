import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Parcela {
  numero: number;
  data: Date;
  valor: number;
  tipo?: string;
  descricao?: string;
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
  const parcelasGoLive = parcelas.filter(p => p.tipo === 'go-live');
  const parcelasNormais = parcelas.filter(p => p.tipo !== 'go-live');

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
        {parcelasGoLive.length > 0 && (
          <div className="text-sm text-amber-600 mt-2">
            ⚠️ Este contrato possui {parcelasGoLive.length} parcela(s) vinculada(s) ao Go Live
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Parcela</TableHead>
                <TableHead>Data Vencimento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((parcela) => (
                <TableRow key={parcela.numero}>
                  <TableCell className="font-medium">
                    {parcela.numero}/{parcelas.length}
                    {parcela.descricao && (
                      <div className="text-xs text-muted-foreground">{parcela.descricao}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {parcela.tipo === 'go-live' ? (
                      <span className="text-amber-600">Após conclusão</span>
                    ) : (
                      format(parcela.data, 'dd/MM/yyyy')
                    )}
                  </TableCell>
                  <TableCell>
                    {parcela.tipo === 'go-live' ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Go Live
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Normal</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(parcela.valor)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right">{formatCurrency(totalParcelas)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        {parcelasGoLive.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Parcelas Go Live:</strong> Serão lançadas em contas a receber/pagar apenas quando o contrato for marcado como concluído.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
