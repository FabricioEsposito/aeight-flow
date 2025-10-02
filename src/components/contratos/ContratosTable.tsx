import { Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Contrato {
  id: string;
  numero_contrato: string;
  tipo_contrato: 'venda' | 'compra';
  data_inicio: string;
  valor_total: number;
  status: string;
  clientes?: { razao_social: string };
  fornecedores?: { razao_social: string };
}

interface ContratosTableProps {
  contratos: Contrato[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ContratosTable({ contratos, onView, onEdit, onDelete }: ContratosTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Cliente/Fornecedor</TableHead>
            <TableHead>Data Início</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contratos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Nenhum contrato encontrado
              </TableCell>
            </TableRow>
          ) : (
            contratos.map((contrato) => (
              <TableRow key={contrato.id}>
                <TableCell className="font-medium">{contrato.numero_contrato}</TableCell>
                <TableCell>
                  <Badge variant={contrato.tipo_contrato === 'venda' ? 'default' : 'secondary'}>
                    {contrato.tipo_contrato === 'venda' ? 'Venda' : 'Compra'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {contrato.tipo_contrato === 'venda' 
                    ? contrato.clientes?.razao_social 
                    : contrato.fornecedores?.razao_social}
                </TableCell>
                <TableCell>{formatDate(contrato.data_inicio)}</TableCell>
                <TableCell className="text-right">{formatCurrency(contrato.valor_total)}</TableCell>
                <TableCell>
                  <Badge variant={contrato.status === 'ativo' ? 'default' : 'secondary'}>
                    {contrato.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onView(contrato.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(contrato.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Contrato</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita
                            e também excluirá todas as parcelas e lançamentos relacionados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onDelete(contrato.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
