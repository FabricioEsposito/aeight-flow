import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit, CheckCircle, XCircle, Eye, Copy } from 'lucide-react';

interface ExtratoActionsDropdownProps {
  tipo: 'entrada' | 'saida';
  status: string;
  onEdit: () => void;
  onMarkAsPaid: () => void;
  onMarkAsOpen: () => void;
  onView: () => void;
  onClone: () => void;
}

export function ExtratoActionsDropdown({
  tipo,
  status,
  onEdit,
  onMarkAsPaid,
  onMarkAsOpen,
  onView,
  onClone,
}: ExtratoActionsDropdownProps) {
  const isPaid = status === 'pago' || status === 'recebido';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background">
        <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
          <Edit className="mr-2 h-4 w-4" />
          Editar lançamento
        </DropdownMenuItem>

        {!isPaid && (
          <DropdownMenuItem onClick={onMarkAsPaid} className="cursor-pointer">
            <CheckCircle className="mr-2 h-4 w-4" />
            {tipo === 'entrada' ? 'Marcar como recebido' : 'Marcar como pago'}
          </DropdownMenuItem>
        )}

        {isPaid && (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
