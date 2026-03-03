import React from 'react';
import { Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const TIPOS = [
  { value: 'CLT', label: 'CLT' },
  { value: 'PJ', label: 'PJ' },
];

interface TipoVinculoFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function TipoVinculoFilter({ value, onChange }: TipoVinculoFilterProps) {
  const toggleTipo = (tipo: string) => {
    if (value.includes(tipo)) {
      onChange(value.filter(v => v !== tipo));
    } else {
      onChange([...value, tipo]);
    }
  };

  const label = value.length === 0
    ? 'Todos os Tipos'
    : value.join(', ');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[160px] justify-start">
          <Users className="w-4 h-4 mr-2 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[160px] p-2" align="start">
        {TIPOS.map(tipo => (
          <button
            key={tipo.value}
            onClick={() => toggleTipo(tipo.value)}
            className={cn(
              'flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors',
              value.includes(tipo.value) && 'font-medium'
            )}
          >
            <div className={cn(
              'w-4 h-4 border rounded flex items-center justify-center shrink-0',
              value.includes(tipo.value) ? 'bg-primary border-primary' : 'border-input'
            )}>
              {value.includes(tipo.value) && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
            {tipo.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
