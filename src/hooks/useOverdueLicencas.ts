import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Determines if a tool's license payment is overdue based on dia_vencimento.
 * A license is considered overdue if today > dia_vencimento of the current month
 * AND it hasn't been paid this month.
 */
export function isFerramentaVencida(diaVencimento: number, pago: boolean): boolean {
  if (pago) return false;
  const today = new Date();
  const dia = today.getDate();
  return dia > diaVencimento;
}

/**
 * Hook that checks for overdue licenses and creates notifications if needed.
 */
export function useOverdueLicencasNotifications(ferramentas: any[]) {
  const { user } = useAuth();

  const overdueFerrramentas = useMemo(() => {
    return ferramentas.filter((f: any) => {
      const qtdLicencas = f.licencas_count || 0;
      if (qtdLicencas === 0) return false;
      if (!f.recorrente) return false;
      return isFerramentaVencida(f.dia_vencimento || 1, !!f.pago_mes_atual);
    });
  }, [ferramentas]);

  useEffect(() => {
    if (!user || overdueFerrramentas.length === 0) return;

    const createNotifications = async () => {
      const today = new Date();
      const mesAno = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

      for (const f of overdueFerrramentas) {
        const { data: existing } = await supabase
          .from("notificacoes")
          .select("id")
          .eq("user_id", user.id)
          .eq("referencia_id", f.id)
          .eq("referencia_tipo", "ferramenta_vencida")
          .like("titulo", `%${mesAno}%`)
          .limit(1);

        if (existing && existing.length > 0) continue;

        await supabase.from("notificacoes").insert({
          user_id: user.id,
          titulo: `Licença vencida - ${mesAno}`,
          mensagem: `A ferramenta "${f.nome}" está com o pagamento vencido (vencimento dia ${f.dia_vencimento}).`,
          tipo: "alerta",
          referencia_id: f.id,
          referencia_tipo: "ferramenta_vencida",
        });
      }
    };

    createNotifications();
  }, [overdueFerrramentas, user]);

  return { overdueCount: overdueFerrramentas.length };
}
