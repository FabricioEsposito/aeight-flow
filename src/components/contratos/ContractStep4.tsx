import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface ContractStep4Props {
  contractData: any;
  updateContractData: (data: any) => void;
}

export default function ContractStep4({ contractData, updateContractData }: ContractStep4Props) {
  
  useEffect(() => {
    calculateValues();
  }, [
    contractData.valor_bruto,
    contractData.desconto_percentual,
    contractData.desconto_valor,
    contractData.irrf,
    contractData.pis,
    contractData.cofins,
    contractData.csll,
  ]);

  const calculateValues = () => {
    const valorBruto = contractData.valor_bruto || 0;
    
    // Calculate discount
    let descontoValor = contractData.desconto_valor || 0;
    let descontoPercentual = contractData.desconto_percentual || 0;
    
    // If percentage is provided, calculate value
    if (descontoPercentual > 0 && descontoValor === 0) {
      descontoValor = (valorBruto * descontoPercentual) / 100;
      updateContractData({ desconto_valor: descontoValor });
    }
    
    // If value is provided, calculate percentage
    if (descontoValor > 0 && descontoPercentual === 0 && valorBruto > 0) {
      descontoPercentual = (descontoValor / valorBruto) * 100;
      updateContractData({ desconto_percentual: descontoPercentual });
    }

    const valorComDesconto = valorBruto - descontoValor;

    // Calculate taxes
    const irrf = (valorComDesconto * (contractData.irrf || 0)) / 100;
    const pis = (valorComDesconto * (contractData.pis || 0)) / 100;
    const cofins = (valorComDesconto * (contractData.cofins || 0)) / 100;
    const csll = (valorComDesconto * (contractData.csll || 0)) / 100;

    const totalImpostos = irrf + pis + cofins + csll;
    const valorLiquido = valorComDesconto - totalImpostos;

    updateContractData({ valor_liquido: valorLiquido });
  };

  const handleDescontoPercentualChange = (value: number) => {
    updateContractData({ 
      desconto_percentual: value,
      desconto_valor: 0 // Reset value when percentage is changed
    });
  };

  const handleDescontoValorChange = (value: number) => {
    updateContractData({ 
      desconto_valor: value,
      desconto_percentual: 0 // Reset percentage when value is changed
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const valorBruto = contractData.valor_bruto || 0;
  const descontoValor = contractData.desconto_valor || 0;
  const valorComDesconto = valorBruto - descontoValor;
  const totalImpostos = 
    (valorComDesconto * (contractData.irrf || 0)) / 100 +
    (valorComDesconto * (contractData.pis || 0)) / 100 +
    (valorComDesconto * (contractData.cofins || 0)) / 100 +
    (valorComDesconto * (contractData.csll || 0)) / 100;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Valores e Impostos</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column - Input fields */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Valor Bruto</Label>
            <div className="text-lg font-semibold text-primary bg-muted p-3 rounded">
              {formatCurrency(valorBruto)}
            </div>
            <p className="text-xs text-muted-foreground">Calculado automaticamente dos itens</p>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Desconto</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Percentual (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={contractData.desconto_percentual || ''}
                  onChange={(e) => handleDescontoPercentualChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={contractData.desconto_valor || ''}
                  onChange={(e) => handleDescontoValorChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Digite o percentual OU o valor do desconto
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Impostos (%)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>IRRF</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={contractData.irrf || ''}
                  onChange={(e) => updateContractData({ irrf: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>PIS</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={contractData.pis || ''}
                  onChange={(e) => updateContractData({ pis: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>COFINS</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={contractData.cofins || ''}
                  onChange={(e) => updateContractData({ cofins: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>CSLL</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={contractData.csll || ''}
                  onChange={(e) => updateContractData({ csll: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Summary */}
        <div className="space-y-6">
          <div className="bg-muted p-6 rounded-lg">
            <h4 className="font-semibold mb-4">Resumo dos Valores</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Valor Bruto:</span>
                <span className="font-medium">{formatCurrency(valorBruto)}</span>
              </div>
              
              {descontoValor > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Desconto:</span>
                  <span>- {formatCurrency(descontoValor)}</span>
                </div>
              )}

              <Separator />
              
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(valorComDesconto)}</span>
              </div>

              {totalImpostos > 0 && (
                <>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    {contractData.irrf > 0 && (
                      <div className="flex justify-between">
                        <span>IRRF ({contractData.irrf}%):</span>
                        <span>- {formatCurrency((valorComDesconto * contractData.irrf) / 100)}</span>
                      </div>
                    )}
                    {contractData.pis > 0 && (
                      <div className="flex justify-between">
                        <span>PIS ({contractData.pis}%):</span>
                        <span>- {formatCurrency((valorComDesconto * contractData.pis) / 100)}</span>
                      </div>
                    )}
                    {contractData.cofins > 0 && (
                      <div className="flex justify-between">
                        <span>COFINS ({contractData.cofins}%):</span>
                        <span>- {formatCurrency((valorComDesconto * contractData.cofins) / 100)}</span>
                      </div>
                    )}
                    {contractData.csll > 0 && (
                      <div className="flex justify-between">
                        <span>CSLL ({contractData.csll}%):</span>
                        <span>- {formatCurrency((valorComDesconto * contractData.csll) / 100)}</span>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                </>
              )}
              
              <div className="flex justify-between text-lg font-bold text-primary">
                <span>Valor Líquido:</span>
                <span>{formatCurrency(contractData.valor_liquido || 0)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h5 className="font-medium text-blue-900 mb-2">Informação Importante</h5>
            <p className="text-sm text-blue-800">
              O valor líquido será usado para gerar as parcelas automáticas no contas a receber.
              Os impostos serão considerados como retenções na fonte.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}