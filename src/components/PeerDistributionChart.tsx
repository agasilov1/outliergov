import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

interface PeerDistributionChartProps {
  peerData: number[];
  providerAmount: number;
  year: number;
}

export function PeerDistributionChart({ peerData, providerAmount, year }: PeerDistributionChartProps) {
  // Create histogram bins
  const binCount = 20;
  const sortedData = [...peerData].sort((a, b) => a - b);
  const minValue = sortedData[0] || 0;
  const maxValue = sortedData[sortedData.length - 1] || 1;
  
  // Use log scale for bins to handle the heavy right tail
  const logMin = Math.log10(Math.max(minValue, 10000));
  const logMax = Math.log10(maxValue);
  const logStep = (logMax - logMin) / binCount;
  
  const bins: { range: string; count: number; start: number; end: number; containsProvider: boolean }[] = [];
  
  for (let i = 0; i < binCount; i++) {
    const logStart = logMin + i * logStep;
    const logEnd = logMin + (i + 1) * logStep;
    const start = Math.pow(10, logStart);
    const end = Math.pow(10, logEnd);
    
    const count = sortedData.filter(v => v >= start && (i === binCount - 1 ? v <= end : v < end)).length;
    const containsProvider = providerAmount >= start && (i === binCount - 1 ? providerAmount <= end : providerAmount < end);
    
    // Format range for display
    const formatValue = (v: number) => {
      if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
      if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
      return `$${v.toFixed(0)}`;
    };
    
    bins.push({
      range: `${formatValue(start)}-${formatValue(end)}`,
      count,
      start,
      end,
      containsProvider
    });
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bins} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <XAxis 
            dataKey="range" 
            angle={-45} 
            textAnchor="end" 
            height={80}
            tick={{ fontSize: 10 }}
            interval={2}
          />
          <YAxis 
            label={{ value: 'Provider Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
          />
          <Tooltip 
            formatter={(value: number) => [value, 'Providers']}
            labelFormatter={(label) => `Range: ${label}`}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {bins.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={entry.containsProvider ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-primary" />
          <span>Peer Group</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-destructive" />
          <span>This Provider ({year})</span>
        </div>
      </div>
    </div>
  );
}
