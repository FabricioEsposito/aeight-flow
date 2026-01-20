import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  subDays, 
  subMonths,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  differenceInDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const [baseDate, setBaseDate] = useState<Date>(new Date());

  // Sync baseDate when customRange changes from outside
  useEffect(() => {
    if (customRange?.from) {
      setBaseDate(customRange.from);
    }
  }, [customRange?.from]);

  const getDateRangeForPreset = (preset: DateRangePreset, refDate: Date): { from: Date; to: Date } | null => {
    switch (preset) {
      case 'hoje':
        return { from: refDate, to: refDate };
      case 'esta-semana':
        return { 
          from: startOfWeek(refDate, { weekStartsOn: 1 }), 
          to: endOfWeek(refDate, { weekStartsOn: 1 }) 
        };
      case 'este-mes':
        return { from: startOfMonth(refDate), to: endOfMonth(refDate) };
      case 'este-ano':
        return { from: startOfYear(refDate), to: endOfYear(refDate) };
      case 'ultimos-30-dias':
        return { from: subDays(refDate, 30), to: refDate };
      case 'ultimos-12-meses':
        return { from: subMonths(refDate, 12), to: refDate };
      default:
        return null;
    }
  };

  const getDisplayLabel = () => {
    if (value === 'periodo-personalizado' && customRange?.from && customRange?.to) {
      return `${format(customRange.from, 'dd/MM/yyyy')} - ${format(customRange.to, 'dd/MM/yyyy')}`;
    }
    
    if (value === 'todo-periodo') {
      return 'Todo período';
    }

    const range = getDateRangeForPreset(value, baseDate);
    if (range) {
      if (value === 'hoje') {
        return format(range.from, 'dd/MM/yyyy');
      }
      return `${format(range.from, 'dd/MM/yyyy')} - ${format(range.to, 'dd/MM/yyyy')}`;
    }
    
    return presetOptions.find(opt => opt.value === value)?.label || 'Selecione';
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    const offset = direction === 'prev' ? -1 : 1;
    
    switch (value) {
      case 'hoje': {
        const newDay = addDays(baseDate, offset);
        setBaseDate(newDay);
        onChange('periodo-personalizado', { from: newDay, to: newDay });
        break;
      }
      
      case 'esta-semana': {
        const currentWeekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
        const newWeekStart = addWeeks(currentWeekStart, offset);
        setBaseDate(newWeekStart);
        onChange('periodo-personalizado', { 
          from: newWeekStart, 
          to: endOfWeek(newWeekStart, { weekStartsOn: 1 }) 
        });
        break;
      }
      
      case 'este-mes': {
        const newMonth = addMonths(startOfMonth(baseDate), offset);
        setBaseDate(newMonth);
        onChange('periodo-personalizado', { 
          from: startOfMonth(newMonth), 
          to: endOfMonth(newMonth) 
        });
        break;
      }
      
      case 'este-ano': {
        const newYear = addYears(startOfYear(baseDate), offset);
        setBaseDate(newYear);
        onChange('periodo-personalizado', { 
          from: startOfYear(newYear), 
          to: endOfYear(newYear) 
        });
        break;
      }
      
      case 'ultimos-30-dias': {
        const newEndDate = addDays(baseDate, offset * 30);
        setBaseDate(newEndDate);
        onChange('periodo-personalizado', { 
          from: subDays(newEndDate, 30), 
          to: newEndDate 
        });
        break;
      }
      
      case 'ultimos-12-meses': {
        const newEndDate = addMonths(baseDate, offset * 12);
        setBaseDate(newEndDate);
        onChange('periodo-personalizado', { 
          from: subMonths(newEndDate, 12), 
          to: newEndDate 
        });
        break;
      }
      
      case 'periodo-personalizado': {
        if (customRange?.from && customRange?.to) {
          const days = differenceInDays(customRange.to, customRange.from);
          const newFrom = addDays(customRange.from, offset * (days + 1));
          const newTo = addDays(customRange.to, offset * (days + 1));
          setBaseDate(newFrom);
          onChange('periodo-personalizado', { from: newFrom, to: newTo });
        }
        break;
      }
    }
  };

  const handlePresetChange = (preset: DateRangePreset) => {
    if (preset === 'periodo-personalizado') {
      setShowCustomDatePicker(true);
    } else {
      // Reset baseDate to today when selecting a new preset
      setBaseDate(new Date());
      onChange(preset);
      setIsOpen(false);
      setShowCustomDatePicker(false);
    }
  };

  const handleCustomRangeApply = () => {
    if (tempRange.from && tempRange.to) {
      setBaseDate(tempRange.from);
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

  const canNavigate = value !== 'todo-periodo';

  const getNavigationTooltip = (direction: 'prev' | 'next'): string => {
    const dirLabel = direction === 'prev' ? 'anterior' : 'próximo';
    switch (value) {
      case 'hoje':
        return `Dia ${dirLabel}`;
      case 'esta-semana':
        return `Semana ${dirLabel}`;
      case 'este-mes':
        return `Mês ${dirLabel}`;
      case 'este-ano':
        return `Ano ${dirLabel}`;
      case 'ultimos-30-dias':
        return direction === 'prev' ? '30 dias antes' : '30 dias depois';
      case 'ultimos-12-meses':
        return direction === 'prev' ? '12 meses antes' : '12 meses depois';
      case 'periodo-personalizado':
        return `Período ${dirLabel}`;
      default:
        return '';
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* Seta Esquerda */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => handleNavigate('prev')}
              disabled={!canNavigate}
              aria-label="Período anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          {canNavigate && (
            <TooltipContent>
              <p>{getNavigationTooltip('prev')}</p>
            </TooltipContent>
          )}
        </Tooltip>

        {/* Botão do Filtro */}
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

        {/* Seta Direita */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => handleNavigate('next')}
              disabled={!canNavigate}
              aria-label="Próximo período"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          {canNavigate && (
            <TooltipContent>
              <p>{getNavigationTooltip('next')}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
