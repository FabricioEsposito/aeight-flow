import React from 'react';
import { MoreVertical, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ActionsDropdownProps {
  status: string;
  onMarkAsPaid: () => void;
  onMarkAsOpen: () => void;
  onView: () => void;
  onDelete: () => void;
}

export function ActionsDropdown({ 
  status, 
  onMarkAsPaid, 
  onMarkAsOpen, 
  onView, 
  onDelete 
}: ActionsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {status !== 'pago' && (
          <DropdownMenuItem onClick={onMarkAsPaid} className="cursor-pointer">
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
            Marcar como {status === 'pendente' ? 'recebido' : 'pago'}
          </DropdownMenuItem>
        )}
        {status === 'pago' && (
          <DropdownMenuItem onClick={onMarkAsOpen} className="cursor-pointer">
            <XCircle className="w-4 h-4 mr-2 text-amber-600" />
            Voltar em aberto
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onView} className="cursor-pointer">
          <Eye className="w-4 h-4 mr-2 text-blue-600" />
          Visualizar informações
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Excluir parcela
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
