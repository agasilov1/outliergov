import { Badge } from '@/components/ui/badge';
import type { ConfidenceLevel } from './ProviderFilters';

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  className?: string;
}

export function ConfidenceBadge({ confidence, className = '' }: ConfidenceBadgeProps) {
  switch (confidence) {
    case 'high':
      return (
        <Badge className={`bg-emerald-100 text-emerald-800 hover:bg-emerald-100 ${className}`}>
          High
        </Badge>
      );
    case 'medium':
      return (
        <Badge className={`bg-amber-100 text-amber-800 hover:bg-amber-100 ${className}`}>
          Medium
        </Badge>
      );
    case 'low':
      return (
        <Badge className={`bg-gray-100 text-gray-800 hover:bg-gray-100 ${className}`}>
          Low
        </Badge>
      );
  }
}

export function getConfidenceLevel(minPeerSize: number): ConfidenceLevel {
  if (minPeerSize >= 20) return 'high';
  if (minPeerSize >= 10) return 'medium';
  return 'low';
}

export function getConfidenceLabel(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case 'high':
      return 'High Confidence Statistical Outlier';
    case 'medium':
      return 'Medium Confidence Statistical Outlier';
    case 'low':
      return 'Lower Confidence Statistical Outlier';
  }
}
