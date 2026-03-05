import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { MOEDAS_DISPONIVEIS } from "@/hooks/useCotacaoMoedas";

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
  const [valorMensal, setValorMensal] = useState(0);
  const [moeda, setMoeda] = useState("BRL");

  useEffect(() => {
    if (ferramenta) {
      setNome(ferramenta.nome || "");
      setDescricao(ferramenta.descricao || "");
      setValorMensal(ferramenta.valor_mensal || 0);
      setMoeda(ferramenta.moeda || "BRL");
    } else {
      setNome("");
      setDescricao("");
      setValorMensal(0);
      setMoeda("BRL");
    }
  }, [ferramenta, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) {
      toast({ title: "Preencha o nome da ferramenta", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const data: any = {
        nome,
        descricao: descricao || null,
        valor_mensal: valorMensal,
        moeda,
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

  const selectedMoeda = MOEDAS_DISPONIVEIS.find((m) => m.value === moeda);

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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select value={moeda} onValueChange={setMoeda}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOEDAS_DISPONIVEIS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor Mensal ({selectedMoeda?.symbol})</Label>
              <CurrencyInput value={valorMensal} onChange={setValorMensal} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {moeda !== "BRL" 
              ? "O valor será convertido para BRL automaticamente usando a cotação do dia (BCB)."
              : "O centro de custo será calculado automaticamente com base nas licenças cadastradas."}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
