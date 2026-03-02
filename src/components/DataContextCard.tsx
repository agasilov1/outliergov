import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Pill, Users, HeartPulse, Stethoscope, Building2 } from 'lucide-react';
import { PossibleExplanations } from '@/components/PossibleExplanations';

interface DataContextCardProps {
  drugPct: number | null;
  totBenes: number | null;
  beneAvgRiskScore: number | null;
  totHcpcsCds: number | null;
  entityType: string | null;
}

interface Insight {
  icon: React.ReactNode;
  text: string;
}

export function DataContextCard({ drugPct, totBenes, beneAvgRiskScore, totHcpcsCds, entityType }: DataContextCardProps) {
  const insights: Insight[] = [];

  if (drugPct !== null && drugPct > 0.8) {
    insights.push({
      icon: <Pill className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />,
      text: `${Math.floor(drugPct * 1000) / 10}% of this provider's billing is drug-related. High allowed amounts are driven by medication costs, not service volume. This is common for providers administering specialty pharmaceuticals such as clotting factors, chemotherapy, or biologics.`,
    });
  }

  if (totBenes !== null && totBenes < 50) {
    insights.push({
      icon: <Users className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />,
      text: `Small patient panel (${totBenes} beneficiaries). Per-beneficiary statistics are amplified when the denominator is small. A single high-cost patient can significantly shift the average.`,
    });
  }

  if (beneAvgRiskScore !== null && beneAvgRiskScore > 2.0) {
    insights.push({
      icon: <HeartPulse className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />,
      text: `High-acuity patient population (risk score: ${beneAvgRiskScore.toFixed(2)}). This provider's patients are sicker than average Medicare beneficiaries (baseline 1.0), which correlates with higher utilization and costs.`,
    });
  }

  if (totHcpcsCds !== null && totHcpcsCds < 15) {
    insights.push({
      icon: <Stethoscope className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />,
      text: `Narrow procedure set (${totHcpcsCds} codes). This provider bills a limited range of services, suggesting a focused subspecialty practice rather than general care.`,
    });
  }

  if (entityType === 'O') {
    insights.push({
      icon: <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />,
      text: `Organizational provider. Billing is aggregated across the organization, not a single practitioner.`,
    });
  }

  if (insights.length === 0) {
    return <PossibleExplanations />;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Data Context
        </CardTitle>
        <CardDescription>
          These observations are derived from the provider's actual billing data and may explain the outlier classification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div key={index} className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
              {insight.icon}
              <p className="text-sm">{insight.text}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
