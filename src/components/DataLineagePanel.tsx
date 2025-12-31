import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Clock, GitBranch, Hash } from 'lucide-react';

interface DatasetRelease {
  id: string;
  release_label: string;
  dataset_key: string;
  status: string;
  ingested_at: string | null;
  source_url: string | null;
}

interface ComputeRun {
  id: string;
  rule_set_version: string;
  status: string;
  finished_at: string | null;
  parameters_json: Record<string, unknown>;
}

interface DataLineagePanelProps {
  datasetRelease: DatasetRelease | null;
  computeRun: ComputeRun | null;
  isLoading?: boolean;
}

export function DataLineagePanel({ datasetRelease, computeRun, isLoading }: DataLineagePanelProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateId = (id: string | null) => {
    if (!id) return '—';
    return id.slice(0, 8) + '...';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Database className="h-4 w-4" />
            Data Lineage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!datasetRelease) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Database className="h-4 w-4" />
            Data Lineage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No active dataset. Seed data from the Admin panel.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Database className="h-4 w-4" />
          Data Lineage
        </CardTitle>
        <CardDescription className="text-xs">
          Source data and computation metadata
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              Dataset
            </div>
            <div className="font-medium">{datasetRelease.release_label}</div>
            <Badge variant="outline" className="text-xs">
              {datasetRelease.status}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Ingested
            </div>
            <div className="font-medium">{formatDate(datasetRelease.ingested_at)}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <GitBranch className="h-3 w-3" />
              Rule Version
            </div>
            <div className="font-medium font-mono text-xs">
              {computeRun?.rule_set_version || '—'}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              Compute Run
            </div>
            <div className="font-medium font-mono text-xs" title={computeRun?.id || ''}>
              {truncateId(computeRun?.id || null)}
            </div>
            {computeRun?.finished_at && (
              <div className="text-xs text-muted-foreground">
                {formatDate(computeRun.finished_at)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
