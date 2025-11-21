import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface Servico {
  id: string;
  codigo: string;
  nome: string;
}

interface ServicosMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function ServicosMultiSelect({ value, onChange, disabled }: ServicosMultiSelectProps) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServicos();
  }, []);

  const fetchServicos = async () => {
    try {
      const { data, error } = await supabase
        .from('servicos')
        .select('id, codigo, nome')
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw error;
      setServicos(data || []);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedServicos = servicos.filter(s => value.includes(s.id));

  const toggleServico = (servicoId: string) => {
    const newValue = value.includes(servicoId)
      ? value.filter(id => id !== servicoId)
      : [...value, servicoId];
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || loading}
          >
            {loading ? "Carregando..." : value.length === 0 ? "Selecione serviços..." : `${value.length} selecionado(s)`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Buscar serviço..." />
            <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {servicos.map((servico) => (
                <CommandItem
                  key={servico.id}
                  value={servico.nome}
                  onSelect={() => toggleServico(servico.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(servico.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {servico.codigo} - {servico.nome}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedServicos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedServicos.map((servico) => (
            <Badge key={servico.id} variant="secondary">
              {servico.codigo} - {servico.nome}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
