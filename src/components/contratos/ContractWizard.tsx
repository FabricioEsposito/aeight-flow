import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ContractStep1 from './ContractStep1';
import ContractStep2 from './ContractStep2';
import ContractStep3 from './ContractStep3';
import ContractStep4 from './ContractStep4';
import ContractStep5 from './ContractStep5';
import { supabase } from '@/integrations/supabase/client';

interface ContractData {
  numero: string;
  cliente_id: string;
  data_inicio: string;
  dia_vencimento: number;
  recorrencia: boolean;
  periodo_recorrencia: string;
  data_fim?: string;
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
  tipo_pagamento: string;
  conta_recebimento_id: string;
}

interface ContractItem {
  servico_id?: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

interface ContractWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editContract?: any;
}

export default function ContractWizard({ open, onOpenChange, onSuccess, editContract }: ContractWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [contractData, setContractData] = useState<ContractData>({
    numero: '',
    cliente_id: '',
    data_inicio: '',
    dia_vencimento: 1,
    recorrencia: false,
    periodo_recorrencia: 'mensal',
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
    tipo_pagamento: '',
    conta_recebimento_id: '',
  });

  // Load edit data when editing
  React.useEffect(() => {
    if (editContract && open) {
      setContractData({
        numero: editContract.numero || '',
        cliente_id: editContract.cliente_id || '',
        data_inicio: editContract.data_inicio || '',
        data_fim: editContract.data_fim || '',
        dia_vencimento: editContract.dia_vencimento || 1,
        recorrencia: editContract.recorrencia || false,
        periodo_recorrencia: editContract.periodo_recorrencia || 'mensal',
        categoria: editContract.categoria || '',
        centro_custo: editContract.centro_custo || '',
        itens: editContract.contrato_itens || [],
        valor_bruto: editContract.valor_bruto || 0,
        desconto_percentual: editContract.desconto_percentual || 0,
        desconto_valor: editContract.desconto_valor || 0,
        irrf: editContract.irrf || 0,
        pis: editContract.pis || 0,
        cofins: editContract.cofins || 0,
        csll: editContract.csll || 0,
        valor_liquido: editContract.valor_liquido || 0,
        tipo_pagamento: editContract.tipo_pagamento || '',
        conta_recebimento_id: editContract.conta_recebimento_id || '',
      });
    }
  }, [editContract, open]);
  const { toast } = useToast();

  const steps = [
    { title: 'Informações', component: ContractStep1 },
    { title: 'Classificações', component: ContractStep2 },
    { title: 'Itens', component: ContractStep3 },
    { title: 'Valores', component: ContractStep4 },
    { title: 'Pagamento', component: ContractStep5 },
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

  const generateReceivables = async (contractId: string) => {
    if (!contractData.recorrencia) return;

    const startDate = new Date(contractData.data_inicio);
    const endDate = contractData.data_fim ? new Date(contractData.data_fim) : null;
    const receivables = [];

    let currentDate = new Date(startDate);
    currentDate.setDate(contractData.dia_vencimento);

    // Generate up to 12 months or until end date
    const maxIterations = endDate ? 
      Math.ceil((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)) : 12;

    for (let i = 0; i < maxIterations; i++) {
      if (endDate && currentDate > endDate) break;

      receivables.push({
        cliente_id: contractData.cliente_id,
        contrato_id: contractId,
        descricao: `${contractData.numero} - Parcela ${i + 1}`,
        valor: contractData.valor_liquido,
        data_competencia: currentDate.toISOString().split('T')[0],
        data_vencimento: currentDate.toISOString().split('T')[0],
        conta_bancaria_id: contractData.conta_recebimento_id,
        centro_custo: contractData.centro_custo,
        status: 'pendente',
      });

      // Next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    if (receivables.length > 0) {
      const { error } = await supabase
        .from('contas_receber')
        .insert(receivables);

      if (error) throw error;
    }
  };

  const handleSave = async () => {
    try {
      const contractToSave = {
        numero: contractData.numero,
        cliente_id: contractData.cliente_id,
        data_inicio: contractData.data_inicio,
        data_fim: contractData.data_fim,
        dia_vencimento: contractData.dia_vencimento,
        recorrencia: contractData.recorrencia,
        periodo_recorrencia: contractData.periodo_recorrencia,
        categoria: contractData.categoria,
        centro_custo: contractData.centro_custo,
        valor_bruto: contractData.valor_bruto,
        valor_total: contractData.valor_bruto,
        desconto_percentual: contractData.desconto_percentual,
        desconto_valor: contractData.desconto_valor,
        irrf: contractData.irrf,
        pis: contractData.pis,
        cofins: contractData.cofins,
        csll: contractData.csll,
        valor_liquido: contractData.valor_liquido,
  tipo_pagamento: contractData.tipo_pagamento,
  conta_recebimento_id: contractData.conta_recebimento_id,
  status: 'ativo' as const,
  tipo_contrato: 'cliente',
      };

      let contract;
      if (editContract) {
        // Update existing contract
        const { data, error: contractError } = await supabase
          .from('contratos')
          .update(contractToSave)
          .eq('id', editContract.id)
          .select()
          .single();

        if (contractError) throw contractError;
        contract = data;

        // Delete existing items and receivables
        await supabase.from('contrato_itens').delete().eq('contrato_id', editContract.id);
        await supabase.from('contas_receber').delete().eq('contrato_id', editContract.id);
      } else {
        // Create new contract
        const { data, error: contractError } = await supabase
          .from('contratos')
          .insert(contractToSave)
          .select()
          .single();

        if (contractError) throw contractError;
        contract = data;
      }

      // Save contract items
      if (contractData.itens.length > 0) {
        const itemsToSave = contractData.itens.map(item => ({
          contrato_id: contract.id,
          servico_id: item.servico_id,
          descricao: item.descricao,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
        }));

        const { error: itemsError } = await supabase
          .from('contrato_itens')
          .insert(itemsToSave);

        if (itemsError) throw itemsError;
      }

      // Generate receivables if recurring
      await generateReceivables(contract.id);

      toast({
        title: "Sucesso",
        description: editContract ? "Contrato atualizado com sucesso!" : "Contrato criado com sucesso!",
      });

      onSuccess();
      onOpenChange(false);
      setCurrentStep(1);
      
      if (!editContract) {
        setContractData({
          numero: '',
          cliente_id: '',
          data_inicio: '',
          dia_vencimento: 1,
          recorrencia: false,
          periodo_recorrencia: 'mensal',
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
          tipo_pagamento: '',
          conta_recebimento_id: '',
        });
      }
    } catch (error) {
      console.error('Erro ao salvar contrato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o contrato.",
        variant: "destructive",
      });
    }
  };

  const StepComponent = steps[currentStep - 1].component;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editContract ? 'Editar Contrato' : 'Novo Contrato'} - 
            Etapa {currentStep}: {steps[currentStep - 1].title}
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

        <StepComponent
          contractData={contractData}
          updateContractData={updateContractData}
        />

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