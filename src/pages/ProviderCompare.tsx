import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['hsl(222, 47%, 20%)', 'hsl(0, 72%, 51%)', 'hsl(142, 71%, 35%)'];

interface ProviderYearMetric {
  npi: string;
  year: number;
  provider_name: string | null;
  specialty: string | null;
  state: string | null;
  allowed_per_bene_cents: number | null;
  peer_median_allowed_per_bene: number | null;
  x_vs_peer_median: number | null;
  percentile_rank: number | null;
  peer_group_size: number | null;
}

export default function ProviderCompare() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const npis = (searchParams.get('npis') || '').split(',').filter(Boolean);

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['compare-metrics', npis],
    queryFn: async () => {
      if (npis.length === 0) return [];
      const { data, error } = await supabase
        .from('provider_year_metrics')
        .select('npi, year, provider_name, specialty, state, allowed_per_bene_cents, peer_median_allowed_per_bene, x_vs_peer_median, percentile_rank, peer_group_size')
        .in('npi', npis)
        .order('year');
      if (error) throw error;
      return data as ProviderYearMetric[];
    },
    enabled: npis.length >= 2,
  });

  // Group by NPI
  const byNpi = useMemo(() => {
    if (!metricsData) return {};
    const map: Record<string, ProviderYearMetric[]> = {};
    metricsData.forEach(m => {
      if (!map[m.npi]) map[m.npi] = [];
      map[m.npi].push(m);
    });
    return map;
  }, [metricsData]);

  // Provider summaries
  const providers = useMemo(() => {
    return npis.map(npi => {
      const rows = byNpi[npi] || [];
      const latest = rows[rows.length - 1];
      return {
        npi,
        name: latest?.provider_name || `NPI ${npi}`,
        specialty: latest?.specialty || 'Unknown',
        state: latest?.state || 'Unknown',
        bestRatio: rows.reduce((max, r) => Math.max(max, r.x_vs_peer_median || 0), 0),
      };
    });
  }, [npis, byNpi]);

  // All years across all providers
  const allYears = useMemo(() => {
    const years = new Set<number>();
    Object.values(byNpi).forEach(rows => rows.forEach(r => years.add(r.year)));
    return [...years].sort();
  }, [byNpi]);

  // Chart data
  const chartData = useMemo(() => {
    return allYears.map(year => {
      const point: Record<string, number | null> = { year };
      npis.forEach(npi => {
        const row = byNpi[npi]?.find(r => r.year === year);
        point[npi] = row?.allowed_per_bene_cents ? row.allowed_per_bene_cents / 100 : null;
      });
      // Use first provider's peer median as reference
      const firstRow = byNpi[npis[0]]?.find(r => r.year === year);
      point['peer_median'] = firstRow?.peer_median_allowed_per_bene || null;
      return point;
    });
  }, [allYears, npis, byNpi]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  if (npis.length < 2) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <Card>
          <CardContent className="flex min-h-[200px] items-center justify-center">
            <p className="text-muted-foreground">Select 2–3 providers from the dashboard to compare.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Provider Comparison</h1>
      </div>

      {/* Provider header cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {providers.map((p, i) => (
          <Card key={p.npi} className="border-l-4" style={{ borderLeftColor: COLORS[i] }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{p.name}</CardTitle>
              <CardDescription>
                NPI: {p.npi} • {p.specialty} • {p.state}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {p.bestRatio > 0 ? (
                <Badge variant="destructive">{p.bestRatio.toFixed(1)}× Peer Median</Badge>
              ) : (
                <Badge variant="outline">No peer data</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allowed Per Beneficiary Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData} margin={{ left: 16, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              {npis.map((npi, i) => (
                <Line
                  key={npi}
                  type="monotone"
                  dataKey={npi}
                  stroke={COLORS[i]}
                  strokeWidth={2}
                  name={providers[i]?.name || npi}
                  connectNulls
                  dot={{ r: 4 }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="peer_median"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Peer Median"
                connectNulls
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Side-by-side metrics table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Year-by-Year Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  {providers.map((p, i) => (
                    <TableHead key={p.npi} colSpan={3} className="text-center border-l" style={{ color: COLORS[i] }}>
                      {p.name}
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow>
                  <TableHead></TableHead>
                  {providers.map(p => (
                    <>
                      <TableHead key={`${p.npi}-apb`} className="text-right border-l text-xs">$/Bene</TableHead>
                      <TableHead key={`${p.npi}-x`} className="text-right text-xs">× Median</TableHead>
                      <TableHead key={`${p.npi}-pct`} className="text-right text-xs">Pctl</TableHead>
                    </>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allYears.map(year => (
                  <TableRow key={year}>
                    <TableCell className="font-medium">{year}</TableCell>
                    {providers.map(p => {
                      const row = byNpi[p.npi]?.find(r => r.year === year);
                      return (
                        <>
                          <TableCell key={`${p.npi}-${year}-apb`} className="text-right border-l font-mono text-sm">
                            {row?.allowed_per_bene_cents ? formatCurrency(row.allowed_per_bene_cents / 100) : '—'}
                          </TableCell>
                          <TableCell key={`${p.npi}-${year}-x`} className="text-right font-mono text-sm">
                            {row?.x_vs_peer_median ? `${row.x_vs_peer_median.toFixed(1)}×` : '—'}
                          </TableCell>
                          <TableCell key={`${p.npi}-${year}-pct`} className="text-right font-mono text-sm">
                            {row?.percentile_rank ? `${row.percentile_rank.toFixed(1)}%` : '—'}
                          </TableCell>
                        </>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
