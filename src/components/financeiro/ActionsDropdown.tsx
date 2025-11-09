import React from 'react';
import { MoreVertical, CheckCircle, XCircle, Eye, Trash2, Edit } from 'lucide-react';
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
  onMarkAsPaid: () => void;
  onMarkAsOpen: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ActionsDropdown({ 
  status, 
  onMarkAsPaid, 
  onMarkAsOpen, 
  onView,
  onEdit, 
  onDelete 
}: ActionsDropdownProps) {
  const isOpen = status !== 'pago';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background z-50">
        {isOpen && (
          <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
            <Edit className="w-4 h-4 mr-2 text-blue-500" />
            <span>Editar parcela</span>
          </DropdownMenuItem>
        )}
        {status !== 'pago' && (
          <DropdownMenuItem onClick={onMarkAsPaid} className="cursor-pointer">
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />
            <span>Marcar como {status === 'pendente' ? 'recebido' : 'pago'}</span>
          </DropdownMenuItem>
        )}
        {status === 'pago' && (
          <DropdownMenuItem onClick={onMarkAsOpen} className="cursor-pointer">
            <XCircle className="w-4 h-4 mr-2 text-amber-500" />
            <span>Voltar em aberto</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onView} className="cursor-pointer">
          <Eye className="w-4 h-4 mr-2 text-blue-500" />
          <span>Visualizar informações</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          <span>Excluir parcela</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
