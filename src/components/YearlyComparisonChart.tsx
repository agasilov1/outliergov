import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface YearlyComparisonChartProps {
  providerMetrics: { year: number; amount: number }[];
  peerMedians: { year: number; median: number }[];
}

export function YearlyComparisonChart({ providerMetrics, peerMedians }: YearlyComparisonChartProps) {
  // Derive unique years from both data sources
  const data = useMemo(() => {
    const years = [...new Set([
      ...providerMetrics.map(m => m.year),
      ...peerMedians.map(m => m.year)
    ])].sort((a, b) => a - b);

    return years.map(year => {
      const providerData = providerMetrics.find(m => m.year === year);
      const medianData = peerMedians.find(m => m.year === year);
      
      return {
        year: year.toString(),
        provider: providerData?.amount || 0,
        median: medianData?.median || 0
      };
    });
  }, [providerMetrics, peerMedians]);

  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <XAxis dataKey="year" />
          <YAxis 
            tickFormatter={formatValue}
            width={80}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              formatValue(value),
              name === 'provider' ? 'This Provider' : 'Peer Median'
            ]}
          />
          <Legend 
            formatter={(value) => value === 'provider' ? 'This Provider' : 'Peer Median'}
          />
          <Bar 
            dataKey="provider" 
            fill="hsl(var(--destructive))" 
            radius={[4, 4, 0, 0]}
            name="provider"
          />
          <Bar 
            dataKey="median" 
            fill="hsl(var(--muted-foreground))" 
            radius={[4, 4, 0, 0]}
            name="median"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
