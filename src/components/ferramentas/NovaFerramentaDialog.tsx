import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { CentroCustoSelect } from "@/components/centro-custos/CentroCustoSelect";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface NovaFerramentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ferramenta?: any;
}

export function NovaFerramentaDialog({ open, onOpenChange, ferramenta }: NovaFerramentaDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [centroCustoId, setCentroCustoId] = useState("");
  const [valorMensal, setValorMensal] = useState(0);

  useEffect(() => {
    if (ferramenta) {
      setNome(ferramenta.nome || "");
      setDescricao(ferramenta.descricao || "");
      setCentroCustoId(ferramenta.centro_custo_id || "");
      setValorMensal(ferramenta.valor_mensal || 0);
    } else {
      setNome("");
      setDescricao("");
      setCentroCustoId("");
      setValorMensal(0);
    }
  }, [ferramenta, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !centroCustoId) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const data = {
        nome,
        descricao: descricao || null,
        centro_custo_id: centroCustoId,
        valor_mensal: valorMensal,
      };

      if (ferramenta) {
        const { error } = await supabase
          .from("ferramentas_software" as any)
          .update(data)
          .eq("id", ferramenta.id);
        if (error) throw error;
        toast({ title: "Ferramenta atualizada com sucesso" });
      } else {
        const { error } = await supabase
          .from("ferramentas_software" as any)
          .insert(data);
        if (error) throw error;
        toast({ title: "Ferramenta criada com sucesso" });
      }

      queryClient.invalidateQueries({ queryKey: ["ferramentas-software"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro ao salvar ferramenta", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{ferramenta ? "Editar Ferramenta" : "Nova Ferramenta"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Adobe Creative Cloud" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição opcional" />
          </div>
          <div className="space-y-2">
            <Label>Centro de Custo *</Label>
            <CentroCustoSelect value={centroCustoId} onChange={setCentroCustoId} />
          </div>
          <div className="space-y-2">
            <Label>Valor Mensal Total (R$)</Label>
            <CurrencyInput value={valorMensal} onChange={setValorMensal} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
