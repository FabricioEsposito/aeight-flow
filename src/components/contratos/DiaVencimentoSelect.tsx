import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DiaVencimentoSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function DiaVencimentoSelect({ value, onChange }: DiaVencimentoSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const dias = useMemo(() => {
    return Array.from({ length: 120 }, (_, i) => ({
      value: (i + 1).toString(),
      label: `${i + 1}º dia após geração`,
    }));
  }, []);

  const filteredDias = useMemo(() => {
    if (!search) return dias;
    return dias.filter(dia => 
      dia.value.includes(search) || 
      dia.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [dias, search]);

  const selectedDia = dias.find(dia => dia.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedDia ? selectedDia.label : 'Selecione o dia...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Pesquisar dia..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nenhum dia encontrado.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-auto">
              {filteredDias.map((dia) => (
                <CommandItem
                  key={dia.value}
                  value={dia.value}
                  onSelect={() => {
                    onChange(dia.value);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === dia.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {dia.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
