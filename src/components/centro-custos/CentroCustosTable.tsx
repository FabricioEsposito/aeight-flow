import { Edit, Trash2, MoreVertical, XCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from 'react';
import { CentroCusto } from '@/pages/CentroCustos';
import { CompanyBadge } from './CompanyBadge';
import { getCompanyTheme } from '@/hooks/useCentroCustoTheme';

interface CentroCustosTableProps {
  centrosCusto: CentroCusto[];
  loading: boolean;
  onEdit: (centroCusto: CentroCusto) => void;
  onDelete: (id: string) => void;
  onInactivate: (id: string) => void;
}

export default function CentroCustosTable({ 
  centrosCusto, 
  loading, 
  onEdit, 
  onDelete,
  onInactivate 
}: CentroCustosTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inactivateDialogOpen, setInactivateDialogOpen] = useState(false);
  const [selectedCentroCusto, setSelectedCentroCusto] = useState<CentroCusto | null>(null);

  const handleDeleteClick = (centroCusto: CentroCusto) => {
    setSelectedCentroCusto(centroCusto);
    setDeleteDialogOpen(true);
  };

  const handleInactivateClick = (centroCusto: CentroCusto) => {
    setSelectedCentroCusto(centroCusto);
    setInactivateDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCentroCusto) {
      onDelete(selectedCentroCusto.id);
    }
    setDeleteDialogOpen(false);
    setSelectedCentroCusto(null);
  };

  const confirmInactivate = () => {
    if (selectedCentroCusto) {
      onInactivate(selectedCentroCusto.id);
    }
    setInactivateDialogOpen(false);
    setSelectedCentroCusto(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Carregando centros de custo...</span>
        </div>
      </div>
    );
  }

  if (centrosCusto.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Nenhum centro de custo encontrado</p>
        <p className="text-sm mt-1">Cadastre o primeiro centro de custo para começar.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Empresa</TableHead>
              <TableHead className="font-semibold">Descrição</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="w-[70px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {centrosCusto.map((centroCusto) => {
              const theme = getCompanyTheme(centroCusto.codigo);
              
              return (
                <TableRow 
                  key={centroCusto.id}
                  className="group hover:bg-muted/30 transition-colors"
                >
                  <TableCell>
                    <CompanyBadge codigo={centroCusto.codigo} />
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{centroCusto.descricao}</span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={centroCusto.status === 'ativo' ? 'default' : 'secondary'}
                      className={centroCusto.status === 'ativo' ? 'bg-success hover:bg-success/90' : ''}
                    >
                      {centroCusto.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background z-50">
                        <DropdownMenuItem onClick={() => onEdit(centroCusto)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        {centroCusto.status === 'ativo' && (
                          <DropdownMenuItem onClick={() => handleInactivateClick(centroCusto)}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Inativar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClick(centroCusto)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o centro de custo "{selectedCentroCusto?.descricao}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={inactivateDialogOpen} onOpenChange={setInactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar inativação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar o centro de custo "{selectedCentroCusto?.descricao}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmInactivate}>Inativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
