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

// Formata valor como moeda brasileira enquanto digita (apenas números)
function formatAsCurrency(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  if (!numbers) return '';
  
  // Converte para centavos e depois para reais
  const cents = parseInt(numbers, 10);
  const reais = cents / 100;
  
  // Formata como moeda brasileira
  return reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
    
    // Formata automaticamente enquanto digita
    const formatted = formatAsCurrency(inputValue);
    setDisplayValue(formatted);
    
    // Converte para número
    const numericValue = parseBrazilianCurrency(formatted);
    onChange(numericValue);
  };

  const handleFocus = () => {
    // Ao focar, se o valor for 0, limpa o campo
    if (value === 0) {
      setDisplayValue('');
    }
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
      inputMode="numeric"
      data-currency-input="true"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
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
    
    // Formata automaticamente enquanto digita
    const formatted = formatAsCurrency(inputValue);
    setDisplayValue(formatted);
    
    // Converte para número
    const numericValue = parseBrazilianCurrency(formatted);
    onChange(numericValue);
  };

  const handleFocus = () => {
    if (value === 0) {
      setDisplayValue('');
    }
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
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
}
