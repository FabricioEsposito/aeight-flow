import React from 'react';
import { MoreVertical, CheckCircle, XCircle, Eye, Trash2, Edit, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface ActionsDropdownProps {
  status: string;
  isAvulso?: boolean;
  onMarkAsPaid: () => void;
  onMarkAsOpen: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCancel?: () => void;
}

export function ActionsDropdown({ 
  status,
  isAvulso = false,
  onMarkAsPaid, 
  onMarkAsOpen, 
  onView,
  onEdit, 
  onDelete,
  onCancel,
}: ActionsDropdownProps) {
  const isPaid = status === 'pago';
  const isCancelled = status === 'cancelado';
  const canEdit = !isPaid && !isCancelled;
  const canMarkPaid = !isPaid && !isCancelled;
  const canReopen = isPaid || isCancelled;
  const canCancel = !!onCancel && !isAvulso && !isPaid && !isCancelled;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background z-50">
        {canEdit && (
          <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
            <Edit className="w-4 h-4 mr-2 text-blue-500" />
            <span>Editar parcela</span>
          </DropdownMenuItem>
        )}
        {canMarkPaid && (
          <DropdownMenuItem onClick={onMarkAsPaid} className="cursor-pointer">
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />
            <span>Marcar como {status === 'pendente' || status === 'vencido' ? 'recebido' : 'pago'}</span>
          </DropdownMenuItem>
        )}
        {canReopen && (
          <DropdownMenuItem onClick={onMarkAsOpen} className="cursor-pointer">
            <XCircle className="w-4 h-4 mr-2 text-amber-500" />
            <span>Voltar em aberto</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onView} className="cursor-pointer">
          <Eye className="w-4 h-4 mr-2 text-blue-500" />
          <span>Visualizar informações</span>
        </DropdownMenuItem>
        {canCancel && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCancel} className="cursor-pointer text-destructive">
              <Ban className="w-4 h-4 mr-2" />
              <span>Cancelar parcela</span>
            </DropdownMenuItem>
          </>
        )}
        {isAvulso && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              <span>Excluir lançamento</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
