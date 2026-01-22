import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ContaBancaria {
  id: string;
  descricao: string;
  banco: string;
  saldo_atual?: number;
}

interface ContaBancariaMultiSelectProps {
  contas: ContaBancaria[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}

export function ContaBancariaMultiSelect({
  contas,
  selectedIds,
  onChange,
  placeholder = "Selecionar contas..."
}: ContaBancariaMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const filteredContas = contas.filter((conta) =>
    conta.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === contas.length) {
      onChange([]);
    } else {
      onChange(contas.map(c => c.id));
    }
  };

  const handleClear = () => {
    onChange([]);
    setSearchTerm('');
  };

  const getDisplayText = () => {
    if (selectedIds.length === 0) {
      return "Todas as contas";
    }
    if (selectedIds.length === 1) {
      const conta = contas.find(c => c.id === selectedIds[0]);
      return conta?.descricao || "1 conta selecionada";
    }
    return `${selectedIds.length} contas selecionadas`;
  };

  const selectedContas = contas.filter(c => selectedIds.includes(c.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[250px] justify-between bg-background hover:bg-primary-light"
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-background border shadow-lg z-50" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Buscar conta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 bg-background"
            />
          </div>
        </div>
        
        <div className="p-2 border-b flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={handleSelectAll}
          >
            {selectedIds.length === contas.length ? 'Desmarcar todas' : 'Selecionar todas'}
          </Button>
          {selectedIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={handleClear}
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        <div className="max-h-[250px] overflow-y-auto">
          {filteredContas.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma conta encontrada
            </div>
          ) : (
            filteredContas.map((conta) => (
              <div
                key={conta.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-primary-light transition-colors",
                  selectedIds.includes(conta.id) && "bg-primary-light"
                )}
                onClick={() => handleToggle(conta.id)}
              >
                <div className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border",
                  selectedIds.includes(conta.id) 
                    ? "bg-primary border-primary text-primary-foreground" 
                    : "border-muted-foreground/30"
                )}>
                  {selectedIds.includes(conta.id) && <Check className="h-3 w-3" />}
                </div>
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium truncate">{conta.descricao}</p>
                 </div>
              </div>
            ))
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="p-2 border-t bg-muted/30">
            <div className="flex flex-wrap gap-1">
              {selectedContas.slice(0, 3).map((conta) => (
                <Badge
                  key={conta.id}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-destructive/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(conta.id);
                  }}
                >
                  {conta.descricao.length > 15 
                    ? conta.descricao.substring(0, 15) + '...' 
                    : conta.descricao}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
              {selectedContas.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedContas.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
