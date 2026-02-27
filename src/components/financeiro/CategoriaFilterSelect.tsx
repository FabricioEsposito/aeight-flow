import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, X, Search, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface PlanoContaOption {
  id: string;
  codigo: string;
  descricao: string;
}

interface CategoriaFilterSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  options: PlanoContaOption[];
  placeholder?: string;
  className?: string;
}

export function CategoriaFilterSelect({
  value,
  onValueChange,
  options,
  placeholder = "Categoria",
  className = "w-[200px]",
}: CategoriaFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const filtered = options.filter((opt) => {
    const searchable = `${opt.codigo} ${opt.descricao}`.toLowerCase();
    return searchable.includes(searchTerm.toLowerCase());
  });

  const handleToggle = (id: string) => {
    if (value.includes(id)) {
      onValueChange(value.filter(i => i !== id));
    } else {
      onValueChange([...value, id]);
    }
  };

  const handleSelectAll = () => {
    if (value.length === options.length) {
      onValueChange([]);
    } else {
      onValueChange(options.map(o => o.id));
    }
  };

  const handleClear = () => {
    onValueChange([]);
    setSearchTerm('');
  };

  const getDisplayText = () => {
    if (value.length === 0) return "Todas as Categorias";
    if (value.length === 1) {
      const opt = options.find(o => o.id === value[0]);
      if (opt) return `${opt.codigo} - ${opt.descricao}`;
      return "1 selecionada";
    }
    return `${value.length} categorias`;
  };

  const selectedOptions = options.filter(o => value.includes(o.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between bg-background hover:bg-primary-light", className)}
        >
          <div className="flex items-center gap-2 truncate">
            <Tag className="w-4 h-4 shrink-0 text-muted-foreground" />
            <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
              {getDisplayText()}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 bg-background border shadow-lg z-50" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Buscar categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 bg-background"
            />
          </div>
        </div>

        <div className="p-2 border-b flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={handleSelectAll}>
            {value.length === options.length ? 'Desmarcar todos' : 'Selecionar todos'}
          </Button>
          {value.length > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={handleClear}>
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        <div className="max-h-[250px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma categoria encontrada
            </div>
          ) : (
            filtered.map((opt) => (
              <div
                key={opt.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-primary-light transition-colors",
                  value.includes(opt.id) && "bg-primary-light"
                )}
                onClick={() => handleToggle(opt.id)}
              >
                <div className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border shrink-0",
                  value.includes(opt.id)
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/30"
                )}>
                  {value.includes(opt.id) && <Check className="h-3 w-3" />}
                </div>
                <span className="text-sm truncate">{opt.codigo} - {opt.descricao}</span>
              </div>
            ))
          )}
        </div>

        {value.length > 0 && (
          <div className="p-2 border-t bg-muted/30">
            <div className="flex flex-wrap gap-1">
              {selectedOptions.slice(0, 3).map((opt) => (
                <Badge
                  key={opt.id}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-destructive/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(opt.id);
                  }}
                >
                  {opt.codigo}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
              {selectedOptions.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedOptions.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
