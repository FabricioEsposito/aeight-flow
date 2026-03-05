import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook that returns unread notification counts grouped by referencia_tipo.
 * Used to show badge counts on sidebar items.
 */
export function useNotificationCounts() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);

  const loadCounts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("referencia_tipo")
        .eq("user_id", user.id)
        .eq("lida", false);

      if (error) throw error;

      const grouped: Record<string, number> = {};
      (data || []).forEach((n) => {
        const tipo = n.referencia_tipo || "geral";
        grouped[tipo] = (grouped[tipo] || 0) + 1;
      });

      setCounts(grouped);
      setTotalUnread(data?.length || 0);
    } catch (err) {
      console.error("Error loading notification counts:", err);
    }
  };

  useEffect(() => {
    if (!user) return;

    loadCounts();

    const channel = supabase
      .channel("sidebar_notification_counts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${user.id}`,
        },
        () => loadCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getCountForRoute = (route: string): number => {
    if (route === "/ferramentas-software") {
      return counts["ferramenta_vencida"] || 0;
    }
    if (route === "/solicitacoes") {
      return counts["solicitacao_ajuste"] || 0;
    }
    return 0;
  };

  return { counts, totalUnread, getCountForRoute };
}
