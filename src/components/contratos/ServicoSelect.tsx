import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

interface Servico {
  id: string;
  codigo: string;
  nome: string;
}

interface ServicoSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  showNoneOption?: boolean;
}

export function ServicoSelect({ value, onChange, disabled, placeholder = 'Selecione um serviço...', showNoneOption }: ServicoSelectProps) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('servicos')
        .select('id, codigo, nome')
        .eq('status', 'ativo')
        .order('nome');
      setServicos(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const selected = servicos.find(s => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled || loading}
        >
          {loading ? 'Carregando...' : selected ? `${selected.codigo} - ${selected.nome}` : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar serviço..." />
          <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {showNoneOption && (
              <CommandItem
                value="__none__"
                onSelect={() => { onChange(''); setOpen(false); }}
              >
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                Nenhum
              </CommandItem>
            )}
            {servicos.map((servico) => (
              <CommandItem
                key={servico.id}
                value={`${servico.codigo} ${servico.nome}`}
                onSelect={() => { onChange(servico.id); setOpen(false); }}
              >
                <Check className={cn("mr-2 h-4 w-4", value === servico.id ? "opacity-100" : "opacity-0")} />
                {servico.codigo} - {servico.nome}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
