import { Eye, Edit, Trash2, MoreVertical, XCircle, Rocket, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
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
  recorrente?: boolean;
  periodo_recorrencia?: string;
  clientes?: { razao_social: string; nome_fantasia: string | null; cnpj_cpf: string };
  fornecedores?: { razao_social: string; nome_fantasia: string | null; cnpj_cpf: string };
  tem_go_live?: boolean;
  centro_custo_info?: CentroCusto;
  importancia_cliente_fornecedor?: 'importante' | 'mediano' | 'nao_importante';
}

interface ContratosTableProps {
  contratos: Contrato[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onInactivate: (id: string, numeroContrato: string) => void;
  onReactivate: (id: string, numeroContrato: string) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function ContratosTable({ 
  contratos, 
  onView, 
  onEdit, 
  onDelete, 
  onInactivate, 
  onReactivate,
  selectedIds = [],
  onSelectionChange,
}: ContratosTableProps) {
  const isSelectable = !!onSelectionChange;

  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? contratos.map(c => c.id) : []);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange([...selectedIds, id]);
      } else {
        onSelectionChange(selectedIds.filter(sid => sid !== id));
      }
    }
  };

  const allSelected = contratos.length > 0 && selectedIds.length === contratos.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < contratos.length;
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

  const formatRecorrencia = (recorrente: boolean | undefined, periodo: string | undefined) => {
    if (!recorrente) return 'Avulso';
    switch (periodo) {
      case 'mensal': return 'Mensal';
      case 'trimestral': return 'Trimestral';
      case 'semestral': return 'Semestral';
      case 'anual': return 'Anual';
      default: return 'Recorrente';
    }
  };

  const getRecorrenciaBadgeVariant = (recorrente: boolean | undefined, periodo: string | undefined) => {
    if (!recorrente) return 'outline';
    switch (periodo) {
      case 'mensal': return 'default';
      case 'trimestral': return 'secondary';
      case 'semestral': return 'secondary';
      case 'anual': return 'secondary';
      default: return 'outline';
    }
  };

  const formatImportancia = (importancia: string | undefined) => {
    switch (importancia) {
      case 'importante': return 'Importante';
      case 'mediano': return 'Mediano';
      case 'nao_importante': return 'Não Importante';
      default: return 'Mediano';
    }
  };

  const getImportanciaBadgeVariant = (importancia: string | undefined): 'default' | 'secondary' | 'outline' => {
    switch (importancia) {
      case 'importante': return 'default';
      case 'mediano': return 'secondary';
      case 'nao_importante': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="rounded-md border overflow-hidden">
      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow>
            {isSelectable && (
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      (el as any).indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            <TableHead className="w-[85px]">Data</TableHead>
            <TableHead className="w-[150px]">Razão Social</TableHead>
            <TableHead className="w-[120px]">Nome Fantasia</TableHead>
            <TableHead className="w-[110px]">Contrato</TableHead>
            <TableHead className="w-[70px]">Tipo</TableHead>
            <TableHead className="w-[80px]">Recorrência</TableHead>
            <TableHead className="w-[120px]">Centro Custos</TableHead>
            <TableHead className="w-[85px]">Import.</TableHead>
            <TableHead className="w-[100px]">Valor Bruto</TableHead>
            <TableHead className="w-[100px]">Valor Líquido</TableHead>
            <TableHead className="w-[70px]">Status</TableHead>
            <TableHead className="w-[50px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contratos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isSelectable ? 13 : 12} className="text-center text-muted-foreground py-8">
                Nenhum contrato encontrado
              </TableCell>
            </TableRow>
          ) : (
            contratos.map((contrato) => {
              const valorBruto = contrato.valor_bruto || (contrato.quantidade && contrato.valor_unitario ? contrato.quantidade * contrato.valor_unitario : contrato.valor_total);
              const isSelected = selectedIds.includes(contrato.id);
              
              return (
                <TableRow key={contrato.id} className={isSelected ? 'bg-muted/50' : ''}>
                  {isSelectable && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectOne(contrato.id, checked === true)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="text-sm">{formatDate(contrato.data_inicio)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col truncate">
                      <span className="font-medium text-sm truncate" title={contrato.tipo_contrato === 'venda' ? contrato.clientes?.razao_social : contrato.fornecedores?.razao_social}>
                        {contrato.tipo_contrato === 'venda' 
                          ? contrato.clientes?.razao_social 
                          : contrato.fornecedores?.razao_social}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {contrato.tipo_contrato === 'venda' 
                          ? formatCnpjCpf(contrato.clientes?.cnpj_cpf || '')
                          : formatCnpjCpf(contrato.fornecedores?.cnpj_cpf || '')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="truncate text-sm" title={contrato.tipo_contrato === 'venda' ? contrato.clientes?.nome_fantasia || '-' : contrato.fornecedores?.nome_fantasia || '-'}>
                    {contrato.tipo_contrato === 'venda' 
                      ? contrato.clientes?.nome_fantasia || '-'
                      : contrato.fornecedores?.nome_fantasia || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <Badge variant="outline" className="w-fit text-xs">{contrato.numero_contrato}</Badge>
                      {contrato.tem_go_live && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-0.5 text-[10px] px-1 py-0 w-fit">
                          <Rocket className="h-2.5 w-2.5" />
                          GoLive
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={contrato.tipo_contrato === 'venda' ? 'default' : 'secondary'} className="text-xs">
                      {contrato.tipo_contrato === 'venda' ? 'Venda' : 'Compra'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRecorrenciaBadgeVariant(contrato.recorrente, contrato.periodo_recorrencia) as any} className="text-xs">
                      {formatRecorrencia(contrato.recorrente, contrato.periodo_recorrencia)}
                    </Badge>
                  </TableCell>
                  <TableCell className="truncate text-sm" title={contrato.centro_custo_info ? `${contrato.centro_custo_info.codigo} - ${contrato.centro_custo_info.descricao}` : contrato.centro_custo || '-'}>
                    {contrato.centro_custo_info 
                      ? `${contrato.centro_custo_info.codigo}`
                      : contrato.centro_custo || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getImportanciaBadgeVariant(contrato.importancia_cliente_fornecedor)} className="text-xs">
                      {contrato.importancia_cliente_fornecedor === 'importante' ? 'Imp.' : 
                       contrato.importancia_cliente_fornecedor === 'mediano' ? 'Med.' : 'N/Imp.'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground text-sm">
                    {formatCurrency(valorBruto)}
                  </TableCell>
                  <TableCell className="font-semibold text-primary text-sm">
                    {formatCurrency(contrato.valor_total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={contrato.status === 'ativo' ? 'default' : 'secondary'} className="text-xs">
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
                        {contrato.status === 'inativo' ? (
                          <DropdownMenuItem 
                            onClick={() => onReactivate(contrato.id, contrato.numero_contrato)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2 text-green-600" />
                            <span className="text-green-600">Reativar</span>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => onInactivate(contrato.id, contrato.numero_contrato)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Inativar
                          </DropdownMenuItem>
                        )}
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
