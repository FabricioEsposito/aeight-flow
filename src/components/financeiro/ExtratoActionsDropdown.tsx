import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit, CheckCircle, XCircle, Eye, Copy, Trash2, Ban } from 'lucide-react';

interface ExtratoActionsDropdownProps {
  tipo: 'entrada' | 'saida';
  status: string;
  isAvulso?: boolean;
  onEdit: () => void;
  onMarkAsPaid: () => void;
  onMarkAsOpen: () => void;
  onView: () => void;
  onClone: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
}

export function ExtratoActionsDropdown({
  tipo,
  status,
  isAvulso = false,
  onEdit,
  onMarkAsPaid,
  onMarkAsOpen,
  onView,
  onClone,
  onDelete,
  onCancel,
}: ExtratoActionsDropdownProps) {
  const isPaid = status === 'pago' || status === 'recebido';
  const isCancelled = status === 'cancelado';
  const canEdit = !isPaid && !isCancelled;
  const canMarkPaid = !isPaid && !isCancelled;
  const canReopen = isPaid || isCancelled;
  const canCancel = !!onCancel && !isAvulso && !isPaid && !isCancelled;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background z-50">
        {canEdit && (
          <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
            <Edit className="mr-2 h-4 w-4" />
            Editar lançamento
          </DropdownMenuItem>
        )}

        {canMarkPaid && (
          <DropdownMenuItem onClick={onMarkAsPaid} className="cursor-pointer">
            <CheckCircle className="mr-2 h-4 w-4" />
            {tipo === 'entrada' ? 'Marcar como recebido' : 'Marcar como pago'}
          </DropdownMenuItem>
        )}

        {canReopen && (
          <DropdownMenuItem onClick={onMarkAsOpen} className="cursor-pointer">
            <XCircle className="mr-2 h-4 w-4" />
            Voltar para em aberto
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onView} className="cursor-pointer">
          <Eye className="mr-2 h-4 w-4" />
          Ver detalhes do lançamento
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onClone} className="cursor-pointer">
          <Copy className="mr-2 h-4 w-4" />
          Clonar lançamento
        </DropdownMenuItem>

        {canCancel && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCancel} className="cursor-pointer text-destructive">
              <Ban className="mr-2 h-4 w-4" />
              Cancelar parcela
            </DropdownMenuItem>
          </>
        )}

        {isAvulso && onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir lançamento
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
