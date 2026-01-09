import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

export function PossibleExplanations() {
  const explanations = [
    {
      title: 'Higher patient acuity',
      description: 'Patients requiring more intensive services due to complex medical conditions or comorbidities.'
    },
    {
      title: 'Referral concentration',
      description: 'Provider may receive a high volume of referrals from surrounding areas or as a regional specialist.'
    },
    {
      title: 'Subspecialty focus',
      description: 'Rare subspecialty practice within the broader specialty category, handling more complex cases.'
    },
    {
      title: 'Regional pricing variations',
      description: 'Geographic differences in cost-of-living and regional Medicare payment adjustments.'
    },
    {
      title: 'Practice size and capacity',
      description: 'Larger practice with more physicians or extended hours serving a higher volume of patients.'
    },
    {
      title: 'Teaching or academic setting',
      description: 'Academic medical centers often see more complex cases referred from community providers.'
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Possible Explanations for Top 0.5% Verification
        </CardTitle>
        <CardDescription>
          Many legitimate factors can result in higher-than-average billing amounts. 
          A high percentile rank alone does not indicate any wrongdoing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {explanations.map((explanation, index) => (
            <div 
              key={index}
              className="rounded-lg border bg-muted/30 p-3 space-y-1"
            >
              <h4 className="font-medium text-sm">{explanation.title}</h4>
              <p className="text-xs text-muted-foreground">{explanation.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
