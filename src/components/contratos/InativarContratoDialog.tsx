import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface InativarContratoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (dataInativacao: Date) => void;
  contratoNumero?: string;
}

export function InativarContratoDialog({
  open,
  onOpenChange,
  onConfirm,
  contratoNumero,
}: InativarContratoDialogProps) {
  const [dataInativacao, setDataInativacao] = useState<Date>(new Date());

  const handleConfirm = () => {
    onConfirm(dataInativacao);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Inativar Contrato</DialogTitle>
          <DialogDescription>
            {contratoNumero && (
              <span className="font-medium text-foreground">Contrato: {contratoNumero}</span>
            )}
            <br />
            Selecione a data de inativação. Apenas parcelas com vencimento <strong>a partir desta data</strong> serão canceladas.
            Parcelas já recebidas/pagas ou com vencimento anterior permanecerão inalteradas.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">Data de Inativação</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !dataInativacao && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataInativacao ? (
                  format(dataInativacao, 'dd/MM/yyyy', { locale: ptBR })
                ) : (
                  <span>Selecione uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataInativacao}
                onSelect={(date) => date && setDataInativacao(date)}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Inativar Contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
