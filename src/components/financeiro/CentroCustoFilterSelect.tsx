import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompanyDot } from '@/components/centro-custos/CompanyBadge';
import { supabase } from '@/integrations/supabase/client';
import { getCompanyTheme } from '@/hooks/useCentroCustoTheme';

interface CentroCusto {
  id: string;
  codigo: string;
  descricao: string;
}

interface CentroCustoFilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
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

  useEffect(() => {
    fetchCentrosCusto();
  }, []);

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

  const getSelectedLabel = () => {
    if (!value || value === 'todos') return placeholder;
    const cc = centrosCusto.find(c => c.id === value);
    if (cc) {
      const theme = getCompanyTheme(cc.codigo);
      return theme.name;
    }
    return placeholder;
  };

  return (
    <Select value={value} onValueChange={onValueChange} disabled={loading}>
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          {value && value !== 'todos' ? (
            <>
              {(() => {
                const cc = centrosCusto.find(c => c.id === value);
                if (cc) {
                  return <CompanyDot codigo={cc.codigo} size="sm" />;
                }
                return <Building2 className="w-4 h-4 text-muted-foreground" />;
              })()}
              <span className="truncate">{getSelectedLabel()}</span>
            </>
          ) : (
            <>
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{loading ? "Carregando..." : placeholder}</span>
            </>
          )}
        </div>
      </SelectTrigger>
      <SelectContent className="bg-background z-50">
        <SelectItem value="todos">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span>Todos os Centros</span>
          </div>
        </SelectItem>
        {centrosCusto.map((cc) => {
          const theme = getCompanyTheme(cc.codigo);
          return (
            <SelectItem key={cc.id} value={cc.id}>
              <div className="flex items-center gap-2">
                <CompanyDot codigo={cc.codigo} size="sm" />
                <span className="font-medium" style={{ color: theme.primaryColor }}>
                  {theme.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({cc.codigo.split('_')[0]})
                </span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
