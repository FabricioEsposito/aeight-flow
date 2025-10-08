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
  const formatPercentageInput = (value: number) => {
    if (!value) return '';
    return value.toString().replace('.', ',') + '%';
  };

  const parsePercentageInput = (value: string) => {
    const numericValue = value.replace('%', '').replace(',', '.').replace(/[^\d.-]/g, '');
    return parseFloat(numericValue) || 0;
  };

  return (
    <Input
      type="text"
      value={formatPercentageInput(value)}
      onChange={(e) => onChange(parsePercentageInput(e.target.value))}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
}