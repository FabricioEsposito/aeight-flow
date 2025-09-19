import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DateInputProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DateInput({ value, onChange, placeholder = "DD/MM/AAAA", className, disabled }: DateInputProps) {
  const [inputValue, setInputValue] = useState(value ? format(value, 'dd/MM/yyyy') : '');
  const [isOpen, setIsOpen] = useState(false);

  const handleInputChange = (inputValue: string) => {
    setInputValue(inputValue);
    
    // Try to parse the date as user types
    if (inputValue.length === 10) {
      try {
        const parsedDate = parse(inputValue, 'dd/MM/yyyy', new Date());
        if (isValid(parsedDate)) {
          onChange(parsedDate);
        }
      } catch {
        // Invalid date format
      }
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onChange(date);
      setInputValue(format(date, 'dd/MM/yyyy'));
      setIsOpen(false);
    }
  };

  const formatInputValue = (input: string) => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');
    
    // Format as DD/MM/YYYY
    if (digits.length >= 2) {
      let formatted = digits.substring(0, 2);
      if (digits.length >= 4) {
        formatted += '/' + digits.substring(2, 4);
        if (digits.length >= 8) {
          formatted += '/' + digits.substring(4, 8);
        }
      }
      return formatted;
    }
    return digits;
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => {
          const formatted = formatInputValue(e.target.value);
          handleInputChange(formatted);
        }}
        placeholder={placeholder}
        maxLength={10}
        disabled={disabled}
        className="pr-10"
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={handleCalendarSelect}
            initialFocus
            className="p-3 pointer-events-auto"
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}