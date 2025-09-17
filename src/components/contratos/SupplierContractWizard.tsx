import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SupplierContractStep1 from './SupplierContractStep1';
import SupplierContractStep2 from './SupplierContractStep2';
import SupplierContractStep3 from './SupplierContractStep3';
import SupplierContractStep4 from './SupplierContractStep4';
import SupplierContractStep5 from './SupplierContractStep5';

interface ContractItem {
  id: string;
  servico_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

interface ContractData {
  numero: string;
  fornecedor_id: string;
  data_inicio: Date | null;
  data_fim: Date | null;
  dia_vencimento: number;
  periodo_recorrencia: string;
  recorrencia: boolean;
  tipo_pagamento: string;
  conta_recebimento_id: string;
  categoria: string;
  centro_custo: string;
  itens: ContractItem[];
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

interface SupplierContractWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function SupplierContractWizard({ open, onOpenChange, onSuccess }: SupplierContractWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [contractData, setContractData] = useState<ContractData>({
    numero: '',
    fornecedor_id: '',
    data_inicio: null,
    data_fim: null,
    dia_vencimento: 1,
    periodo_recorrencia: 'mensal',
    recorrencia: false,
    tipo_pagamento: '',
    conta_recebimento_id: '',
    categoria: '',
    centro_custo: '',
    itens: [],
    valor_bruto: 0,
    desconto_percentual: 0,
    desconto_valor: 0,
    irrf: 0,
    pis: 0,
    cofins: 0,
    csll: 0,
    valor_liquido: 0,
    valor_total: 0,
  });
  const { toast } = useToast();

  const steps = [
    { title: 'Informações', description: 'Dados básicos do contrato' },
    { title: 'Classificações', description: 'Categoria e centro de custo' },
    { title: 'Itens', description: 'Produtos e serviços' },
    { title: 'Valores', description: 'Cálculos e impostos' },
    { title: 'Pagamento', description: 'Forma e condições' },
  ];

  const updateContractData = (data: Partial<ContractData>) => {
    setContractData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generatePayables = async (contratoId: string) => {
    if (!contractData.recorrencia || !contractData.data_inicio || !contractData.dia_vencimento) {
      return;
    }

    const payables = [];
    const startDate = new Date(contractData.data_inicio);
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), contractData.dia_vencimento);
    
    // Se o dia já passou no mês atual, começar no próximo mês
    if (currentDate < startDate) {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Para período determinado, gerar até a data fim
    if (contractData.periodo_recorrencia === 'mensal' && contractData.data_fim) {
      const endDate = new Date(contractData.data_fim);
      while (currentDate <= endDate) {
        payables.push({
          contrato_id: contratoId,
          fornecedor_id: contractData.fornecedor_id,
          valor: contractData.valor_liquido,
          data_vencimento: new Date(currentDate).toISOString().split('T')[0],
          data_competencia: new Date(currentDate).toISOString().split('T')[0],
          descricao: `Contrato ${contractData.numero} - ${new Date(currentDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
          centro_custo: contractData.centro_custo,
          plano_conta_id: contractData.categoria,
          conta_bancaria_id: contractData.conta_recebimento_id || null,
          status: 'pendente'
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    } else if (contractData.periodo_recorrencia === 'indeterminado') {
      // Para indeterminado, gerar apenas os próximos 12 meses
      for (let i = 0; i < 12; i++) {
        payables.push({
          contrato_id: contratoId,
          fornecedor_id: contractData.fornecedor_id,
          valor: contractData.valor_liquido,
          data_vencimento: new Date(currentDate).toISOString().split('T')[0],
          data_competencia: new Date(currentDate).toISOString().split('T')[0],
          descricao: `Contrato ${contractData.numero} - ${new Date(currentDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
          centro_custo: contractData.centro_custo,
          plano_conta_id: contractData.categoria,
          conta_bancaria_id: contractData.conta_recebimento_id || null,
          status: 'pendente'
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    if (payables.length > 0) {
      const { error } = await supabase
        .from('contas_pagar')
        .insert(payables);

      if (error) {
        console.error('Erro ao gerar contas a pagar:', error);
        throw error;
      }
    }
  };

  const handleSave = async () => {
    try {
      // Validações
      if (!contractData.numero || !contractData.fornecedor_id || !contractData.data_inicio) {
        toast({
          title: "Erro de validação",
          description: "Preencha todos os campos obrigatórios.",
          variant: "destructive"
        });
        return;
      }

      if (contractData.itens.length === 0) {
        toast({
          title: "Erro de validação", 
          description: "Adicione pelo menos um item ao contrato.",
          variant: "destructive"
        });
        return;
      }

      // Salvar contrato
      const contratoData = {
        numero: contractData.numero,
        fornecedor_id: contractData.fornecedor_id,
        data_inicio: contractData.data_inicio.toISOString().split('T')[0],
        data_fim: contractData.data_fim ? contractData.data_fim.toISOString().split('T')[0] : null,
        dia_vencimento: contractData.dia_vencimento,
        periodo_recorrencia: contractData.periodo_recorrencia,
        recorrencia: contractData.recorrencia,
        tipo_pagamento: contractData.tipo_pagamento,
        conta_recebimento_id: contractData.conta_recebimento_id || null,
        categoria: contractData.categoria,
        centro_custo: contractData.centro_custo,
        valor_bruto: contractData.valor_bruto,
        desconto_percentual: contractData.desconto_percentual,
        desconto_valor: contractData.desconto_valor,
        irrf: contractData.irrf,
        pis: contractData.pis,
        cofins: contractData.cofins,
        csll: contractData.csll,
        valor_total: contractData.valor_total,
        valor_liquido: contractData.valor_liquido,
        tipo_contrato: 'fornecedor',
        status: 'ativo' as const
      };

      const { data: contrato, error: contratoError } = await supabase
        .from('contratos')
        .insert([contratoData])
        .select()
        .single();

      if (contratoError) throw contratoError;

      // Salvar itens do contrato
      const itensData = contractData.itens.map(item => ({
        contrato_id: contrato.id,
        servico_id: item.servico_id || null,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total
      }));

      const { error: itensError } = await supabase
        .from('contrato_itens')
        .insert(itensData);

      if (itensError) throw itensError;

      // Gerar contas a pagar se for recorrente
      await generatePayables(contrato.id);

      toast({
        title: "Sucesso!",
        description: "Contrato de fornecedor criado com sucesso.",
      });

      onOpenChange(false);
      onSuccess();

      // Reset form
      setContractData({
        numero: '',
        fornecedor_id: '',
        data_inicio: null,
        data_fim: null,
        dia_vencimento: 1,
        periodo_recorrencia: 'mensal',
        recorrencia: false,
        tipo_pagamento: '',
        conta_recebimento_id: '',
        categoria: '',
        centro_custo: '',
        itens: [],
        valor_bruto: 0,
        desconto_percentual: 0,
        desconto_valor: 0,
        irrf: 0,
        pis: 0,
        cofins: 0,
        csll: 0,
        valor_liquido: 0,
        valor_total: 0,
      });
      setCurrentStep(1);

    } catch (error) {
      console.error('Erro ao salvar contrato:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar contrato. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Novo Contrato de Fornecedor - Etapa {currentStep}: {steps[currentStep - 1].title}
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex justify-between items-center mb-6">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index + 1 <= currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              <div className="ml-2 text-sm">{step.title}</div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 ml-4 ${
                  index + 1 < currentStep ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="min-h-[400px]">
          {currentStep === 1 && (
            <SupplierContractStep1 
              contractData={contractData} 
              updateContractData={updateContractData} 
            />
          )}
          {currentStep === 2 && (
            <SupplierContractStep2 
              contractData={contractData} 
              updateContractData={updateContractData} 
            />
          )}
          {currentStep === 3 && (
            <SupplierContractStep3 
              contractData={contractData} 
              updateContractData={updateContractData} 
            />
          )}
          {currentStep === 4 && (
            <SupplierContractStep4 
              contractData={contractData} 
              updateContractData={updateContractData} 
            />
          )}
          {currentStep === 5 && (
            <SupplierContractStep5 
              contractData={contractData} 
              updateContractData={updateContractData} 
            />
          )}
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          {currentStep < steps.length ? (
            <Button onClick={handleNext}>
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSave}>
              Salvar Contrato
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}