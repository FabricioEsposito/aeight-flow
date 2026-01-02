import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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

interface Vendedor {
  id: string;
  nome: string;
}

interface VendedorFilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  vendedores: Vendedor[];
  placeholder?: string;
  disabled?: boolean;
}

export function VendedorFilterSelect({
  value,
  onValueChange,
  vendedores,
  placeholder = "Todos os vendedores",
  disabled = false,
}: VendedorFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredVendedores = useMemo(() => {
    if (!search) return vendedores;
    return vendedores.filter(v => 
      v.nome.toLowerCase().includes(search.toLowerCase())
    );
  }, [vendedores, search]);

  const selectedVendedor = vendedores.find(v => v.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedVendedor ? selectedVendedor.nome : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Buscar vendedor..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nenhum vendedor encontrado.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-auto">
              <CommandItem
                value=""
                onSelect={() => {
                  onValueChange("");
                  setOpen(false);
                  setSearch('');
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    !value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {placeholder}
              </CommandItem>
              {filteredVendedores.map((vendedor) => (
                <CommandItem
                  key={vendedor.id}
                  value={vendedor.id}
                  onSelect={() => {
                    onValueChange(vendedor.id);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === vendedor.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {vendedor.nome}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
