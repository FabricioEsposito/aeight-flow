import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, X, Search, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CompanyDot } from '@/components/centro-custos/CompanyBadge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CentroCusto {
  id: string;
  codigo: string;
  descricao: string;
}

interface CentroCustoFilterSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function CentroCustoFilterSelect({ 
  value, 
  onValueChange, 
  placeholder = "Centro de Custo",
  className = "w-[200px]"
}: CentroCustoFilterSelectProps) {
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCentrosCusto();
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const fetchCentrosCusto = async () => {
    try {
      const { data, error } = await supabase
        .from('centros_custo')
        .select('id, codigo, descricao')
        .eq('status', 'ativo')
        .order('codigo');

      if (error) throw error;
      setCentrosCusto(data || []);
    } catch (error) {
      console.error('Erro ao buscar centros de custo:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCentros = centrosCusto.filter((cc) => {
    const displayCode = cc.codigo.split('_')[0] || cc.codigo;
    const searchable = `${displayCode} ${cc.descricao}`.toLowerCase();
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
    if (value.length === centrosCusto.length) {
      onValueChange([]);
    } else {
      onValueChange(centrosCusto.map(c => c.id));
    }
  };

  const handleClear = () => {
    onValueChange([]);
    setSearchTerm('');
  };

  const getDisplayText = () => {
    if (value.length === 0) {
      return "Todos os Centros";
    }
    if (value.length === 1) {
      const cc = centrosCusto.find(c => c.id === value[0]);
      if (cc) {
        const displayCode = cc.codigo.split('_')[0] || cc.codigo;
        return `${displayCode} - ${cc.descricao}`;
      }
      return "1 centro selecionado";
    }
    return `${value.length} centros selecionados`;
  };

  const selectedCentros = centrosCusto.filter(c => value.includes(c.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between bg-background hover:bg-primary-light", className)}
          disabled={loading}
        >
          <div className="flex items-center gap-2 truncate">
            {value.length === 1 ? (
              <>
                <CompanyDot codigo={centrosCusto.find(c => c.id === value[0])?.codigo || ''} size="sm" />
                <span className="truncate">{getDisplayText()}</span>
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
                  {loading ? "Carregando..." : getDisplayText()}
                </span>
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-background border shadow-lg z-50" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Buscar centro de custo..."
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
            {value.length === centrosCusto.length ? 'Desmarcar todos' : 'Selecionar todos'}
          </Button>
          {value.length > 0 && (
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
          {filteredCentros.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum centro de custo encontrado
            </div>
          ) : (
            filteredCentros.map((cc) => {
              const displayCode = cc.codigo.split('_')[0] || cc.codigo;
              return (
                <div
                  key={cc.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-primary-light transition-colors",
                    value.includes(cc.id) && "bg-primary-light"
                  )}
                  onClick={() => handleToggle(cc.id)}
                >
                  <div className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border shrink-0",
                    value.includes(cc.id) 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : "border-muted-foreground/30"
                  )}>
                    {value.includes(cc.id) && <Check className="h-3 w-3" />}
                  </div>
                  <CompanyDot codigo={cc.codigo} size="sm" />
                  <span className="text-sm font-medium truncate">{displayCode} - {cc.descricao}</span>
                </div>
              );
            })
          )}
        </div>

        {value.length > 0 && (
          <div className="p-2 border-t bg-muted/30">
            <div className="flex flex-wrap gap-1">
              {selectedCentros.slice(0, 3).map((cc) => {
                const displayCode = cc.codigo.split('_')[0] || cc.codigo;
                return (
                  <Badge
                    key={cc.id}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-destructive/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(cc.id);
                    }}
                  >
                    {displayCode}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                );
              })}
              {selectedCentros.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedCentros.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
