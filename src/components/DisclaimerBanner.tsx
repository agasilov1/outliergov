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
          ? 'This analysis surfaces statistical variance only. It does not imply wrongdoing. Many benign explanations exist for outlier status.'
          : 'This tool surfaces statistical anomalies in public data. It does not allege fraud or wrongdoing.'
        }
      </span>
    </div>
  );
}
