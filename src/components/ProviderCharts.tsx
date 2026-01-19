import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';

interface FlagYear {
  year: number;
  percentile_rank: number;
  totalAllowedDollars: number;
  allowedPerBeneDollars: number | null;
  peerMedianPerBeneDollars: number | null;
  peerGroupSize: number | null;
  xVsPeerMedian: number | null;
  verifiedTop05: boolean;
  beneficiaries: number | null;
  services: number | null;
}

interface ProviderChartsProps {
  flagYears: FlagYear[];
  formatCurrency: (value: number) => string;
}

interface ChartDataPoint {
  year: string;
  provider: number | null;
  peerMedian: number | null;
  xVsPeerMedian: number | null;
}

// Custom tooltip component that shows exact dollar values matching the table
const CustomBarTooltip = ({ 
  active, 
  payload, 
  label, 
  formatCurrency 
}: { 
  active?: boolean; 
  payload?: Array<{ dataKey: string; value: number | null; payload: ChartDataPoint }>;
  label?: string;
  formatCurrency: (value: number) => string;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const providerData = payload.find(p => p.dataKey === 'provider');
  const peerData = payload.find(p => p.dataKey === 'peerMedian');
  const xVsMedian = payload[0]?.payload?.xVsPeerMedian;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[200px]">
      <p className="font-semibold mb-2">{label}</p>
      {providerData && providerData.value !== null && (
        <p className="text-sm" style={{ color: 'hsl(var(--destructive))' }}>
          Provider: {formatCurrency(providerData.value)}
        </p>
      )}
      {peerData && peerData.value !== null && (
        <p className="text-sm text-muted-foreground">
          Peer Median: {formatCurrency(peerData.value)}
        </p>
      )}
      {xVsMedian !== null && xVsMedian !== undefined && (
        <p className="text-sm font-medium mt-1 pt-1 border-t">
          {xVsMedian.toFixed(1)}× peer median
        </p>
      )}
    </div>
  );
};

const CustomLineTooltip = ({ 
  active, 
  payload, 
  label, 
  formatCurrency 
}: { 
  active?: boolean; 
  payload?: Array<{ dataKey: string; value: number | null }>;
  label?: string;
  formatCurrency: (value: number) => string;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const providerData = payload.find(p => p.dataKey === 'provider');
  const peerData = payload.find(p => p.dataKey === 'peerMedian');

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[200px]">
      <p className="font-semibold mb-2">{label}</p>
      {providerData && providerData.value !== null && (
        <p className="text-sm" style={{ color: 'hsl(var(--destructive))' }}>
          Provider: {formatCurrency(providerData.value)}
        </p>
      )}
      {peerData && peerData.value !== null && (
        <p className="text-sm text-muted-foreground">
          Peer Median: {formatCurrency(peerData.value)}
        </p>
      )}
    </div>
  );
};

export function ProviderCharts({ flagYears, formatCurrency }: ProviderChartsProps) {
  // Filter to years with valid provider data
  const validYears = flagYears.filter(y => y.allowedPerBeneDollars !== null);
  
  if (validYears.length === 0) {
    return null;
  }

  // Transform data for charts - values are already in dollars
  const chartData: ChartDataPoint[] = validYears.map(y => ({
    year: y.year.toString(),
    provider: y.allowedPerBeneDollars,
    peerMedian: y.peerMedianPerBeneDollars,
    xVsPeerMedian: y.xVsPeerMedian
  }));

  const showLineChart = validYears.length >= 2;

  // Y-axis formatter - values are already in dollars, show in thousands
  const yAxisFormatter = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };

  const chartConfig = {
    provider: {
      label: "Provider",
      color: "hsl(var(--destructive))"
    },
    peerMedian: {
      label: "Peer Median",
      color: "hsl(var(--muted-foreground))"
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Bar Chart: Provider vs Peer Median */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Allowed per Beneficiary Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tickFormatter={yAxisFormatter}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip 
                content={({ active, payload, label }) => (
                  <CustomBarTooltip 
                    active={active} 
                    payload={payload as Array<{ dataKey: string; value: number | null; payload: ChartDataPoint }>} 
                    label={label} 
                    formatCurrency={formatCurrency} 
                  />
                )}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="provider" 
                name="Provider"
                fill="hsl(var(--destructive))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="peerMedian" 
                name="Peer Median"
                fill="hsl(var(--muted-foreground))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Line Chart: Trend Over Time (only if 2+ years) */}
      {showLineChart && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Trend Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="year" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tickFormatter={yAxisFormatter}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip 
                  content={({ active, payload, label }) => (
                    <CustomLineTooltip 
                      active={active} 
                      payload={payload as Array<{ dataKey: string; value: number | null }>} 
                      label={label} 
                      formatCurrency={formatCurrency} 
                    />
                  )}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line 
                  type="monotone" 
                  dataKey="provider" 
                  name="Provider"
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2 }}
                  connectNulls
                />
                <Line 
                  type="monotone" 
                  dataKey="peerMedian" 
                  name="Peer Median"
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: 'hsl(var(--muted-foreground))', strokeWidth: 2 }}
                  connectNulls
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* If only 1 year, show info message instead of line chart */}
      {!showLineChart && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Trend Over Time
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[280px]">
            <p className="text-sm text-muted-foreground text-center">
              Trend chart requires 2+ years of data.<br />
              Only {validYears.length} year available.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
