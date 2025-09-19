import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CurrencyInput, PercentageInput } from '@/components/ui/currency-input';

interface ContractData {
  valor_bruto: number;
  desconto_percentual: number;
  desconto_valor: number;
  irrf: number;
  pis: number;
  cofins: number;
  csll: number;
  valor_liquido: number;
  valor_total: number;
}

interface SupplierContractStep4Props {
  contractData: ContractData;
  updateContractData: (data: Partial<ContractData>) => void;
}

export default function SupplierContractStep4({ contractData, updateContractData }: SupplierContractStep4Props) {
  
  useEffect(() => {
    calculateValues();
  }, [
    contractData.valor_bruto,
    contractData.desconto_percentual,
    contractData.desconto_valor,
    contractData.irrf,
    contractData.pis,
    contractData.cofins,
    contractData.csll
  ]);

  const calculateValues = () => {
    const valorBruto = contractData.valor_bruto || 0;
    
    // Calcular desconto
    let descontoValor = contractData.desconto_valor || 0;
    if (contractData.desconto_percentual > 0) {
      descontoValor = (valorBruto * contractData.desconto_percentual) / 100;
    }
    
    const valorComDesconto = valorBruto - descontoValor;
    
    // Calcular impostos
    const irrfValor = (valorComDesconto * (contractData.irrf || 0)) / 100;
    const pisValor = (valorComDesconto * (contractData.pis || 0)) / 100;
    const cofinsValor = (valorComDesconto * (contractData.cofins || 0)) / 100;
    const csllValor = (valorComDesconto * (contractData.csll || 0)) / 100;
    
    const totalImpostos = irrfValor + pisValor + cofinsValor + csllValor;
    const valorLiquido = valorComDesconto - totalImpostos;
    
    updateContractData({
      desconto_valor: descontoValor,
      valor_total: valorComDesconto,
      valor_liquido: valorLiquido
    });
  };

  const handleDescontoPercentualChange = (value: number) => {
    updateContractData({
      desconto_percentual: value,
      desconto_valor: 0 // Reset valor direto quando usar percentual
    });
  };

  const handleDescontoValorChange = (value: number) => {
    updateContractData({
      desconto_valor: value,
      desconto_percentual: 0 // Reset percentual quando usar valor direto
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Valores e Impostos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Valor Bruto */}
          <div className="space-y-2">
            <Label>Valor Bruto (dos itens)</Label>
            <div className="p-3 bg-muted rounded border text-right font-medium">
              {formatCurrency(contractData.valor_bruto)}
            </div>
          </div>

          {/* Descontos */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Descontos</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="desconto_percentual">Desconto (%)</Label>
                <PercentageInput
                  value={contractData.desconto_percentual || 0}
                  onChange={handleDescontoPercentualChange}
                  placeholder="0,00%"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desconto_valor">Desconto (R$)</Label>
                <CurrencyInput
                  value={contractData.desconto_valor || 0}
                  onChange={handleDescontoValorChange}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Impostos */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Impostos (%)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="irrf">IRRF (%)</Label>
                <PercentageInput
                  value={contractData.irrf || 0}
                  onChange={(value) => updateContractData({ irrf: value })}
                  placeholder="0,00%"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pis">PIS (%)</Label>
                <PercentageInput
                  value={contractData.pis || 0}
                  onChange={(value) => updateContractData({ pis: value })}
                  placeholder="0,00%"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cofins">COFINS (%)</Label>
                <PercentageInput
                  value={contractData.cofins || 0}
                  onChange={(value) => updateContractData({ cofins: value })}
                  placeholder="0,00%"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="csll">CSLL (%)</Label>
                <PercentageInput
                  value={contractData.csll || 0}
                  onChange={(value) => updateContractData({ csll: value })}
                  placeholder="0,00%"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Resumo */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Resumo</Label>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span>Valor Bruto:</span>
                <span className="font-medium">{formatCurrency(contractData.valor_bruto)}</span>
              </div>
              {contractData.desconto_valor > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Desconto:</span>
                  <span className="font-medium">-{formatCurrency(contractData.desconto_valor)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Valor com Desconto:</span>
                <span className="font-medium">{formatCurrency(contractData.valor_total)}</span>
              </div>
              {(contractData.irrf > 0 || contractData.pis > 0 || contractData.cofins > 0 || contractData.csll > 0) && (
                <div className="flex justify-between text-red-600">
                  <span>Impostos:</span>
                  <span className="font-medium">
                    -{formatCurrency(contractData.valor_total - contractData.valor_liquido)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold text-primary">
                <span>Valor Líquido Final:</span>
                <span>{formatCurrency(contractData.valor_liquido)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}