import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SupplierContractWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function SupplierContractWizard({ open, onOpenChange, onSuccess }: SupplierContractWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();

  const steps = [
    { title: 'Informações', description: 'Dados básicos do contrato' },
    { title: 'Classificações', description: 'Categoria e centro de custo' },
    { title: 'Itens', description: 'Produtos e serviços' },
    { title: 'Valores', description: 'Cálculos e impostos' },
    { title: 'Pagamento', description: 'Forma e condições' },
  ];

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

  const handleSave = () => {
    toast({
      title: "Em desenvolvimento",
      description: "Funcionalidade de contratos de fornecedores em desenvolvimento.",
    });
    onOpenChange(false);
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

        <div className="min-h-[300px] flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">{steps[currentStep - 1].title}</h3>
            <p className="text-muted-foreground mb-4">{steps[currentStep - 1].description}</p>
            <p className="text-sm text-muted-foreground">
              Esta funcionalidade está em desenvolvimento e será implementada em breve.
            </p>
          </div>
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