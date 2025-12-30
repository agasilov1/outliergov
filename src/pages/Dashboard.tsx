import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, AlertTriangle, Users, TrendingUp, Loader2 } from 'lucide-react';

interface AnomalyFlag {
  id: string;
  provider_id: string;
  specialty: string;
  state: string;
  percentile_2023: number;
  percentile_2024: number;
  peer_group_size: number;
  providers: {
    id: string;
    npi: string;
    provider_name: string;
  };
}

export default function Dashboard() {
  const { user, isAdmin, roles } = useAuth();
  const navigate = useNavigate();

  // Fetch flagged providers with their details
  const { data: flaggedProviders, isLoading: flaggedLoading } = useQuery({
    queryKey: ['flagged-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anomaly_flags')
        .select(`
          id,
          provider_id,
          specialty,
          state,
          percentile_2023,
          percentile_2024,
          peer_group_size,
          providers (
            id,
            npi,
            provider_name
          )
        `)
        .order('percentile_2024', { ascending: false });
      
      if (error) throw error;
      return data as AnomalyFlag[];
    }
  });

  // Fetch total providers count
  const { data: totalProviders } = useQuery({
    queryKey: ['total-providers'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('providers')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    }
  });

  // Fetch distinct peer groups count
  const { data: peerGroupCount } = useQuery({
    queryKey: ['peer-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('specialty, state');
      
      if (error) throw error;
      
      // Count unique specialty+state combinations
      const uniqueGroups = new Set(data?.map(p => `${p.specialty}|${p.state}`));
      return uniqueGroups.size;
    }
  });

  const formatPercentile = (value: number) => {
    return `${Number(value).toFixed(1)}th`;
  };

  const handleRowClick = (providerId: string) => {
    navigate(`/provider/${providerId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Statistical anomaly analysis of healthcare spending data
        </p>
      </div>

      {/* User info card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Welcome back
            {isAdmin && (
              <Badge variant="secondary" className="bg-accent text-accent-foreground">
                Admin
              </Badge>
            )}
          </CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Roles:</span>
            {roles.length > 0 ? (
              roles.map((role) => (
                <Badge key={role} variant="outline">
                  {role}
                </Badge>
              ))
            ) : (
              <Badge variant="outline">No roles assigned</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Providers</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {flaggedLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (flaggedProviders?.length || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              ≥99.5th percentile rank (2 years)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProviders?.toLocaleString() || '--'}</div>
            <p className="text-xs text-muted-foreground">
              In database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peer Groups</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{peerGroupCount || '--'}</div>
            <p className="text-xs text-muted-foreground">
              Specialty + State combinations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Period</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2023-2024</div>
            <p className="text-xs text-muted-foreground">
              Consecutive years analyzed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Flagged providers table */}
      <Card>
        <CardHeader>
          <CardTitle>Flagged Providers</CardTitle>
          <CardDescription>
            Providers with total allowed amount at or above the 99.5th percentile rank of their peer group for both 2023 and 2024.
            Click a row to view details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {flaggedLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !flaggedProviders || flaggedProviders.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
              No flagged providers found. Seed data and run anomaly computation from the Admin panel.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider Name</TableHead>
                  <TableHead>NPI</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">2023 Percentile Rank</TableHead>
                  <TableHead className="text-right">2024 Percentile Rank</TableHead>
                  <TableHead className="text-right">Peer Group Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flaggedProviders.map((flag) => (
                  <TableRow
                    key={flag.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(flag.provider_id)}
                  >
                    <TableCell className="font-medium">
                      {flag.providers?.provider_name || 'Unknown'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {flag.providers?.npi || '-'}
                    </TableCell>
                    <TableCell>{flag.specialty}</TableCell>
                    <TableCell>{flag.state}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive" className="font-mono">
                        {formatPercentile(flag.percentile_2023)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive" className="font-mono">
                        {formatPercentile(flag.percentile_2024)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {flag.peer_group_size < 20 ? (
                        <span className="text-warning">{flag.peer_group_size}</span>
                      ) : (
                        flag.peer_group_size
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
