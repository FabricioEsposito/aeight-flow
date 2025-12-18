import { Eye, Edit, Trash2, MoreVertical, XCircle, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface CentroCusto {
  id: string;
  codigo: string;
  descricao: string;
}

interface Contrato {
  id: string;
  numero_contrato: string;
  tipo_contrato: 'venda' | 'compra';
  data_inicio: string;
  valor_total: number;
  valor_bruto?: number;
  quantidade?: number;
  valor_unitario?: number;
  status: string;
  centro_custo?: string;
  clientes?: { razao_social: string; nome_fantasia: string | null; cnpj_cpf: string };
  fornecedores?: { razao_social: string; nome_fantasia: string | null; cnpj_cpf: string };
  tem_go_live?: boolean;
  centro_custo_info?: CentroCusto;
}

interface ContratosTableProps {
  contratos: Contrato[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onInactivate: (id: string) => void;
}

export function ContratosTable({ contratos, onView, onEdit, onDelete, onInactivate }: ContratosTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCnpjCpf = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Razão Social</TableHead>
            <TableHead>Nome Fantasia</TableHead>
            <TableHead>Contrato</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Centro de Custos</TableHead>
            <TableHead>Valor Bruto</TableHead>
            <TableHead>Valor Líquido</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contratos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                Nenhum contrato encontrado
              </TableCell>
            </TableRow>
          ) : (
            contratos.map((contrato) => {
              const valorBruto = contrato.valor_bruto || (contrato.quantidade && contrato.valor_unitario ? contrato.quantidade * contrato.valor_unitario : contrato.valor_total);
              
              return (
                <TableRow key={contrato.id}>
                  <TableCell>{formatDate(contrato.data_inicio)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {contrato.tipo_contrato === 'venda' 
                          ? contrato.clientes?.razao_social 
                          : contrato.fornecedores?.razao_social}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {contrato.tipo_contrato === 'venda' 
                          ? formatCnpjCpf(contrato.clientes?.cnpj_cpf || '')
                          : formatCnpjCpf(contrato.fornecedores?.cnpj_cpf || '')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {contrato.tipo_contrato === 'venda' 
                      ? contrato.clientes?.nome_fantasia || '-'
                      : contrato.fornecedores?.nome_fantasia || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{contrato.numero_contrato}</Badge>
                      {contrato.tem_go_live && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                          <Rocket className="h-3 w-3" />
                          Go Live
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={contrato.tipo_contrato === 'venda' ? 'default' : 'secondary'}>
                      {contrato.tipo_contrato === 'venda' ? 'Venda' : 'Compra'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {contrato.centro_custo_info 
                      ? `${contrato.centro_custo_info.codigo} - ${contrato.centro_custo_info.descricao}`
                      : contrato.centro_custo || '-'}
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground">
                    {formatCurrency(valorBruto)}
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    {formatCurrency(contrato.valor_total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={contrato.status === 'ativo' ? 'default' : 'secondary'}>
                      {contrato.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onView(contrato.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(contrato.id)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onInactivate(contrato.id)}
                          disabled={contrato.status === 'inativo'}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Inativar
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                              <span className="text-destructive">Excluir</span>
                            </DropdownMenuItem>
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
