import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export type DateRangePreset = 
  | 'todo-periodo'
  | 'hoje'
  | 'esta-semana'
  | 'este-mes'
  | 'este-ano'
  | 'ultimos-30-dias'
  | 'ultimos-12-meses'
  | 'periodo-personalizado';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangeFilterProps {
  value: DateRangePreset;
  onChange: (preset: DateRangePreset, range?: DateRange) => void;
  customRange?: DateRange;
}

export function DateRangeFilter({ value, onChange, customRange }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange>({
    from: customRange?.from,
    to: customRange?.to,
  });

  const getDisplayLabel = () => {
    const today = new Date();
    
    if (value === 'periodo-personalizado' && customRange?.from && customRange?.to) {
      return `${format(customRange.from, 'dd/MM/yyyy')} - ${format(customRange.to, 'dd/MM/yyyy')}`;
    }
    
    // Sempre mostrar as datas do período selecionado
    let from: Date, to: Date;
    
    switch (value) {
      case 'hoje':
        from = to = today;
        break;
      case 'esta-semana':
        from = startOfWeek(today, { weekStartsOn: 1 });
        to = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'este-mes':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'este-ano':
        from = startOfYear(today);
        to = endOfYear(today);
        break;
      case 'ultimos-30-dias':
        from = subDays(today, 30);
        to = today;
        break;
      case 'ultimos-12-meses':
        from = subMonths(today, 12);
        to = today;
        break;
      case 'todo-periodo':
        return 'Todo período';
      default:
        return presetOptions.find(opt => opt.value === value)?.label || 'Selecione';
    }
    
    return `${format(from, 'dd/MM/yyyy')} - ${format(to, 'dd/MM/yyyy')}`;
  };

  const handlePresetChange = (preset: DateRangePreset) => {
    if (preset === 'periodo-personalizado') {
      setShowCustomDatePicker(true);
    } else {
      onChange(preset);
      setIsOpen(false);
      setShowCustomDatePicker(false);
    }
  };

  const handleCustomRangeApply = () => {
    if (tempRange.from && tempRange.to) {
      onChange('periodo-personalizado', tempRange);
      setIsOpen(false);
      setShowCustomDatePicker(false);
    }
  };

  const handleCancel = () => {
    setShowCustomDatePicker(false);
    setTempRange({
      from: customRange?.from,
      to: customRange?.to,
    });
  };

  const presetOptions = [
    { value: 'todo-periodo', label: 'Todo período' },
    { value: 'hoje', label: 'Hoje' },
    { value: 'esta-semana', label: 'Esta semana' },
    { value: 'este-mes', label: 'Este mês' },
    { value: 'este-ano', label: 'Este ano' },
    { value: 'ultimos-30-dias', label: 'Últimos 30 dias' },
    { value: 'ultimos-12-meses', label: 'Últimos 12 meses' },
    { value: 'periodo-personalizado', label: 'Período personalizado' },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-between min-w-[200px]"
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          {getDisplayLabel()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {!showCustomDatePicker ? (
          <div className="p-3 space-y-2">
            {presetOptions.map((option) => (
              <Button
                key={option.value}
                variant={value === option.value ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handlePresetChange(option.value as DateRangePreset)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !tempRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {tempRange.from ? format(tempRange.from, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tempRange.from}
                      onSelect={(date) => setTempRange({ ...tempRange, from: date })}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !tempRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {tempRange.to ? format(tempRange.to, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tempRange.to}
                      onSelect={(date) => setTempRange({ ...tempRange, to: date })}
                      locale={ptBR}
                      className="pointer-events-auto"
                      disabled={(date) => tempRange.from ? date < tempRange.from : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCustomRangeApply}
                disabled={!tempRange.from || !tempRange.to}
                className="flex-1"
              >
                Aplicar filtro
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
