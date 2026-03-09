import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useWatchlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: watchlistNpis = [], isLoading } = useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('watchlist_items')
        .select('npi')
        .eq('user_id', user.id);
      if (error) throw error;
      return data.map(d => d.npi);
    },
    enabled: !!user,
  });

  const watchlistSet = new Set(watchlistNpis);

  const toggleMutation = useMutation({
    mutationFn: async (npi: string) => {
      if (!user) throw new Error('Not authenticated');
      // Query fresh state instead of using stale watchlistSet
      const { data: existing } = await supabase
        .from('watchlist_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('npi', npi)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('watchlist_items')
          .delete()
          .eq('user_id', user.id)
          .eq('npi', npi);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('watchlist_items')
          .insert({ user_id: user.id, npi });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] });
    },
  });

  return {
    watchlistSet,
    isLoading,
    toggleWatchlist: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
  };
}
