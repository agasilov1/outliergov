import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

interface OutlierConcentrationChartsProps {
  excludeInstitutional: boolean;
}

export function OutlierConcentrationCharts({ excludeInstitutional }: OutlierConcentrationChartsProps) {
  // Fetch all specialties and states from outlier_registry
  const { data: registryData, isLoading } = useQuery({
    queryKey: ['outlier-concentration', excludeInstitutional],
    queryFn: async () => {
      let query = supabase
        .from('outlier_registry')
        .select('specialty, state');
      
      if (excludeInstitutional) {
        query = query.eq('is_institutional', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as { specialty: string | null; state: string | null }[];
    },
  });

  const specialtyData = useMemo(() => {
    if (!registryData) return [];
    const counts: Record<string, number> = {};
    registryData.forEach(r => {
      const key = r.specialty || 'Unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [registryData]);

  const stateData = useMemo(() => {
    if (!registryData) return [];
    const counts: Record<string, number> = {};
    registryData.forEach(r => {
      const key = r.state || 'Unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [registryData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top 10 Specialties by Outlier Count</CardTitle>
        </CardHeader>
        <CardContent>
          {specialtyData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={specialtyData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 18) + '…' : v}
                />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Outliers" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top 10 States by Outlier Count</CardTitle>
        </CardHeader>
        <CardContent>
          {stateData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stateData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={40} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} name="Outliers" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
