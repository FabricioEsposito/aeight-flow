import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

export type DateFilterType = 'vencimento' | 'competencia';

interface DateTypeFilterProps {
  value: DateFilterType;
  onChange: (value: DateFilterType) => void;
}

export function DateTypeFilter({ value, onChange }: DateTypeFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <Calendar className="w-4 h-4 mr-2" />
        <SelectValue placeholder="Tipo de data" />
      </SelectTrigger>
      <SelectContent className="bg-background z-50">
        <SelectItem value="vencimento">Data de Vencimento</SelectItem>
        <SelectItem value="competencia">Data de Competência</SelectItem>
      </SelectContent>
    </Select>
  );
}
