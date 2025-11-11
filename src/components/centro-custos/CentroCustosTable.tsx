import { Edit, Trash2, MoreVertical, XCircle } from 'lucide-react';
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
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (centrosCusto.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum centro de custo encontrado
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {centrosCusto.map((centroCusto) => (
              <TableRow key={centroCusto.id}>
                <TableCell>
                  <Badge variant="outline">{centroCusto.codigo}</Badge>
                </TableCell>
                <TableCell>{centroCusto.descricao}</TableCell>
                <TableCell>
                  <Badge variant={centroCusto.status === 'ativo' ? 'default' : 'secondary'}>
                    {centroCusto.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
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
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
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
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
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