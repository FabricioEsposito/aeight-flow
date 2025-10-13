import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export type DateRangePreset = 
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

  const getCurrentMonthYear = () => {
    return format(new Date(), 'MMMM yyyy', { locale: ptBR });
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
          {value === 'periodo-personalizado' && customRange?.from && customRange?.to
            ? `${format(customRange.from, 'dd/MM/yyyy')} - ${format(customRange.to, 'dd/MM/yyyy')}`
            : presetOptions.find(opt => opt.value === value)?.label || getCurrentMonthYear()
          }
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
            <div>
              <label className="text-sm font-medium mb-2 block">Data Inicial</label>
              <Calendar
                mode="single"
                selected={tempRange.from}
                onSelect={(date) => setTempRange({ ...tempRange, from: date })}
                initialFocus
                locale={ptBR}
                className="pointer-events-auto"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Data Final</label>
              <Calendar
                mode="single"
                selected={tempRange.to}
                onSelect={(date) => setTempRange({ ...tempRange, to: date })}
                locale={ptBR}
                className="pointer-events-auto"
                disabled={(date) => tempRange.from ? date < tempRange.from : false}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCustomRangeApply}
                disabled={!tempRange.from || !tempRange.to}
                className="flex-1"
              >
                Aplicar
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
