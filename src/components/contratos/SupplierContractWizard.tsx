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
  editContract?: any;
}

export default function SupplierContractWizard({ open, onOpenChange, onSuccess, editContract }: SupplierContractWizardProps) {
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

  // Load edit data when editing
  React.useEffect(() => {
    if (editContract && open) {
      setContractData({
        numero: editContract.numero || '',
        fornecedor_id: editContract.fornecedor_id || '',
        data_inicio: editContract.data_inicio ? new Date(editContract.data_inicio) : null,
        data_fim: editContract.data_fim ? new Date(editContract.data_fim) : null,
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
        valor_total: editContract.valor_total || 0,
        tipo_pagamento: editContract.tipo_pagamento || '',
        conta_recebimento_id: editContract.conta_recebimento_id || '',
      });
    }
  }, [editContract, open]);
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
  let parcelaCount = 1;
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
          valor_parcela: contractData.valor_liquido,
          data_vencimento: new Date(currentDate).toISOString().split('T')[0],
          status_pagamento: 'pendente',
          numero_parcela: parcelaCount,
          data_competencia: new Date(currentDate).toISOString().split('T')[0],
          descricao: `Contrato ${contractData.numero} - Parcela ${parcelaCount}`,
          centro_custo: contractData.centro_custo,
          plano_conta_id: contractData.categoria,
          conta_bancaria_id: contractData.conta_recebimento_id || null,
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
        parcelaCount++;
      }
    }
    // Para período indeterminado, gerar 12 meses
    if (contractData.periodo_recorrencia === 'indeterminado') {
      for (let i = 0; i < 12; i++) {
        payables.push({
          contrato_id: contratoId,
          fornecedor_id: contractData.fornecedor_id,
          valor_parcela: contractData.valor_liquido,
          data_vencimento: new Date(currentDate).toISOString().split('T')[0],
          status_pagamento: 'pendente',
          numero_parcela: parcelaCount,
          data_competencia: new Date(currentDate).toISOString().split('T')[0],
          descricao: `Contrato ${contractData.numero} - Parcela ${parcelaCount}`,
          centro_custo: contractData.centro_custo,
          plano_conta_id: contractData.categoria,
          conta_bancaria_id: contractData.conta_recebimento_id || null,
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
        parcelaCount++;
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
    // Validações
    if (!contractData.numero || !contractData.fornecedor_id || !contractData.data_inicio) {
      toast({
        title: "Erro de validação",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    // Validações detalhadas
    if (!contractData.numero) {
      toast({ title: "Erro de validação", description: "Número do contrato é obrigatório.", variant: "destructive" });
      return;
    }
    if (!contractData.fornecedor_id) {
      toast({ title: "Erro de validação", description: "Fornecedor é obrigatório.", variant: "destructive" });
      return;
    }
    if (!contractData.data_inicio || isNaN(contractData.data_inicio.getTime())) {
      toast({ title: "Erro de validação", description: "Data de início inválida.", variant: "destructive" });
      return;
    }
    if (contractData.recorrencia && contractData.periodo_recorrencia === 'mensal' && (!contractData.data_fim || isNaN(contractData.data_fim.getTime()))) {
      toast({ title: "Erro de validação", description: "Data final é obrigatória para recorrência mensal.", variant: "destructive" });
      return;
    }
    if (!contractData.dia_vencimento || contractData.dia_vencimento < 1 || contractData.dia_vencimento > 31) {
      toast({ title: "Erro de validação", description: "Dia de vencimento inválido.", variant: "destructive" });
      return;
    }
    if (!contractData.tipo_pagamento) {
      toast({ title: "Erro de validação", description: "Tipo de pagamento é obrigatório.", variant: "destructive" });
      return;
    }
    if (!contractData.conta_recebimento_id) {
      toast({ title: "Erro de validação", description: "Conta de pagamento é obrigatória.", variant: "destructive" });
      return;
    }
    if (!contractData.categoria) {
      toast({ title: "Erro de validação", description: "Categoria é obrigatória.", variant: "destructive" });
      return;
    }
    if (!contractData.centro_custo) {
      toast({ title: "Erro de validação", description: "Centro de custo é obrigatório.", variant: "destructive" });
      return;
    }
    if (contractData.itens.length === 0) {
      toast({ title: "Erro de validação", description: "Adicione pelo menos um item ao contrato.", variant: "destructive" });
      return;
    }
    try {
      // Estrutura de dados
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
      let contrato;
      if (editContract) {
        // Update existing contract
        const { data, error: contractError } = await (supabase as any)
          .from('contratos')
          .update(contratoData)
          .eq('id', editContract.id)
          .select()
          .single();
        if (contractError) {
          throw contractError;
        }
        contrato = data;
        await (supabase as any).from('contrato_itens').delete().eq('contrato_id', editContract.id);
        await (supabase as any).from('contas_pagar').delete().eq('contrato_id', editContract.id);
      } else {
        // Create new contract
        const { data, error: contractError } = await (supabase as any)
          .from('contratos')
          .insert([contratoData])
          .select()
          .single();
        if (contractError) {
          throw contractError;
        }
        contrato = data;
      }
      // Save contract items
      const itensData = contractData.itens.map(item => ({
        contrato_id: contrato.id,
        servico_id: item.servico_id || null,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total
      }));
      const { error: itensError } = await (supabase as any)
        .from('contrato_itens')
        .insert(itensData);
      if (itensError) {
        throw itensError;
      }
      // Generate payables if recurring
      await generatePayables(contrato.id);
      toast({
        title: "Sucesso!",
        description: editContract ? "Contrato atualizado com sucesso!" : "Contrato de fornecedor criado com sucesso.",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error?.message || "Ocorreu um erro ao salvar o contrato.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {editContract ? 'Editar Contrato de Fornecedor' : 'Criar Contrato de Fornecedor'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col">
          {/* Steps Navigation */}
          <div className="flex items-center mb-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg ${
                    index + 1 === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="ml-2 text-sm">{step.title}</div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 ml-4 ${index + 1 < currentStep ? 'bg-primary' : 'bg-muted'}`} />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}