import React from 'react';
import { Input } from '@/components/ui/input';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CurrencyInput({ value, onChange, placeholder = "0,00", className, disabled }: CurrencyInputProps) {
  const formatCurrencyInput = (value: number) => {
    if (!value) return '';
    return value.toString().replace('.', ',');
  };

  const parseCurrencyInput = (value: string) => {
    const numericValue = value.replace(',', '.').replace(/[^\d.-]/g, '');
    return parseFloat(numericValue) || 0;
  };

  return (
    <Input
      type="text"
      value={formatCurrencyInput(value)}
      onChange={(e) => onChange(parseCurrencyInput(e.target.value))}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
}

interface PercentageInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PercentageInput({ value, onChange, placeholder = "0,00%", className, disabled }: PercentageInputProps) {
  const [displayValue, setDisplayValue] = React.useState('');

  React.useEffect(() => {
    if (!value) {
      setDisplayValue('');
    } else if (document.activeElement?.getAttribute('type') !== 'text') {
      setDisplayValue(value.toString().replace('.', ','));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Remove tudo exceto números, vírgula e ponto
    const filtered = inputValue.replace(/[^\d,.-]/g, '');
    
    setDisplayValue(filtered);
    
    // Converte para número
    const numericValue = filtered.replace(',', '.').replace(/[^\d.-]/g, '');
    const parsed = parseFloat(numericValue);
    
    onChange(isNaN(parsed) ? 0 : parsed);
  };

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
}