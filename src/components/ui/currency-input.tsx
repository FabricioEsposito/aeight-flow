import React from 'react';
import { Input } from '@/components/ui/input';

// Formata número para o padrão brasileiro: 1.000,00
export function formatBrazilianCurrency(value: number): string {
  if (isNaN(value) || value === 0) return '';
  
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Parse valor brasileiro para número
export function parseBrazilianCurrency(value: string): number {
  if (!value) return 0;
  // Remove pontos (separador de milhar) e substitui vírgula por ponto
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CurrencyInput({ value, onChange, placeholder = "0,00", className, disabled }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Só atualiza quando não estiver focado
    if (document.activeElement !== inputRef.current) {
      if (!value || value === 0) {
        setDisplayValue('');
      } else {
        setDisplayValue(formatBrazilianCurrency(value));
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Remove tudo exceto números, vírgula e ponto
    const filtered = inputValue.replace(/[^\d,.-]/g, '');
    
    setDisplayValue(filtered);
    
    // Converte para número usando o parser brasileiro
    const numericValue = parseBrazilianCurrency(filtered);
    onChange(numericValue);
  };

  const handleBlur = () => {
    // Ao perder foco, formata o valor corretamente
    if (value && value !== 0) {
      setDisplayValue(formatBrazilianCurrency(value));
    } else {
      setDisplayValue('');
    }
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      data-currency-input="true"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
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
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      if (!value || value === 0) {
        setDisplayValue('');
      } else {
        setDisplayValue(formatBrazilianCurrency(value));
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Remove tudo exceto números, vírgula e ponto
    const filtered = inputValue.replace(/[^\d,.-]/g, '');
    
    setDisplayValue(filtered);
    
    // Converte para número
    const numericValue = parseBrazilianCurrency(filtered);
    onChange(numericValue);
  };

  const handleBlur = () => {
    if (value && value !== 0) {
      setDisplayValue(formatBrazilianCurrency(value));
    } else {
      setDisplayValue('');
    }
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
}
