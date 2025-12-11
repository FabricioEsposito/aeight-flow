import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      setFavorites([]);
      setLoading(false);
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("user_favorites")
        .select("menu_item")
        .eq("user_id", user.id);

      if (error) throw error;
      setFavorites(data?.map((f) => f.menu_item) || []);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (menuItem: string) => {
    if (!user) return;

    const isFavorite = favorites.includes(menuItem);

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from("user_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("menu_item", menuItem);

        if (error) throw error;
        setFavorites(favorites.filter((f) => f !== menuItem));
      } else {
        const { error } = await supabase
          .from("user_favorites")
          .insert({ user_id: user.id, menu_item: menuItem });

        if (error) throw error;
        setFavorites([...favorites, menuItem]);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const isFavorite = (menuItem: string) => favorites.includes(menuItem);

  return { favorites, loading, toggleFavorite, isFavorite };
}
