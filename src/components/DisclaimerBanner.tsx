import { AlertTriangle } from 'lucide-react';

interface DisclaimerBannerProps {
  variant?: 'default' | 'detailed';
}

export function DisclaimerBanner({ variant = 'default' }: DisclaimerBannerProps) {
  return (
    <div className="flex items-center justify-center gap-2 bg-banner px-4 py-2 text-sm text-banner-foreground">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        {variant === 'detailed' 
          ? 'This registry identifies statistically extreme Medicare billing patterns using public data. Inclusion does not imply fraud, illegality, or improper conduct.'
          : 'This registry identifies statistically extreme billing patterns. Inclusion does not imply fraud or wrongdoing.'
        }
      </span>
    </div>
  );
}
