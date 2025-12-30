import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Shield, Users, Building2, FileText, Copy, Check, Loader2, UserPlus, Clock, Mail, Database, RefreshCw } from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  role: string;
  firm_id: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  roles: string[];
  firm_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

interface Firm {
  id: string;
  name: string;
}

export default function Admin() {
  const { user, session } = useAuth();
  const [activeSection, setActiveSection] = useState<'invite' | 'users' | 'firms' | 'data' | 'audit'>('invite');
  
  // Data management state
  const [seedLoading, setSeedLoading] = useState(false);
  const [recomputeLoading, setRecomputeLoading] = useState(false);
  const [lastComputeStats, setLastComputeStats] = useState<{ providers: number; flagged: number; peerGroups: number } | null>(null);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'firm_user'>('firm_user');
  const [inviteFirmId, setInviteFirmId] = useState<string>('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkExpiry, setLinkExpiry] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Data state
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadData();
  }, [session]);

  async function loadData() {
    if (!session) return;
    
    setLoadingData(true);
    try {
      // Load firms
      const { data: firmsData } = await supabase
        .from('firms')
        .select('id, name')
        .order('name');
      setFirms(firmsData || []);

      // Load invitations (admin can see via RLS)
      const { data: invitationsData } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });
      setInvitations(invitationsData || []);

      // Load users via edge function
      const { data, error } = await supabase.functions.invoke('list-users');
      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      } else {
        setUsers(data?.users || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleGenerateInvite() {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (inviteRole === 'firm_user' && !inviteFirmId) {
      toast.error('Please select a firm for firm users');
      return;
    }

    setInviteLoading(true);
    setGeneratedLink(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-invite', {
        body: {
          email: inviteEmail,
          role: inviteRole,
          firm_id: inviteRole === 'firm_user' ? inviteFirmId : null
        }
      });

      if (error) {
        toast.error('Failed to generate invitation');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setGeneratedLink(data.invite_url);
      setLinkExpiry(data.expires_at);
      toast.success('Invitation link generated!');
      
      // Refresh invitations list
      loadData();
    } catch (error) {
      console.error('Error generating invite:', error);
      toast.error('Failed to generate invitation');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!generatedLink) return;
    
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  }

  async function handleSeedData() {
    if (!confirm('This will clear existing provider data and seed 5,000 synthetic providers. Continue?')) return;
    setSeedLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-synthetic-data');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Seeded ${data.providers_created} providers with ${data.metrics_created} metrics`);
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to seed data');
    } finally {
      setSeedLoading(false);
    }
  }

  async function handleRecomputeAnomalies() {
    setRecomputeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('recompute-anomalies');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLastComputeStats({
        providers: data.providers_analyzed,
        flagged: data.providers_flagged,
        peerGroups: data.peer_groups_analyzed
      });
      toast.success(`Flagged ${data.providers_flagged} providers out of ${data.providers_analyzed}`);
    } catch (error) {
      console.error('Error recomputing anomalies:', error);
      toast.error('Failed to recompute anomalies');
    } finally {
      setRecomputeLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function isExpired(expiresAt: string) {
    return new Date(expiresAt) < new Date();
  }

  const pendingInvitations = invitations.filter(i => !i.accepted_at && !isExpired(i.expires_at));
  const acceptedInvitations = invitations.filter(i => i.accepted_at);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <Badge className="bg-accent text-accent-foreground">
            <Shield className="mr-1 h-3 w-3" />
            Admin Only
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Manage users, firms, and system settings
        </p>
      </div>

      {/* Section Navigation */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className={`cursor-pointer transition-colors ${activeSection === 'invite' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
          onClick={() => setActiveSection('invite')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-5 w-5 text-accent" />
              Invite Users
            </CardTitle>
          </CardHeader>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${activeSection === 'users' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
          onClick={() => setActiveSection('users')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-accent" />
              All Users ({users.length})
            </CardTitle>
          </CardHeader>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${activeSection === 'firms' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
          onClick={() => setActiveSection('firms')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-accent" />
              Firms ({firms.length})
            </CardTitle>
          </CardHeader>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${activeSection === 'data' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
          onClick={() => setActiveSection('data')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-5 w-5 text-accent" />
              Data Management
            </CardTitle>
          </CardHeader>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${activeSection === 'audit' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
          onClick={() => setActiveSection('audit')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-accent" />
              Audit Logs
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Invite Users Section */}
      {activeSection === 'invite' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Generate Invitation Link</CardTitle>
              <CardDescription>
                Create a magic link to invite a new user. Share the link manually.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'firm_user')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="firm_user">Firm User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {inviteRole === 'firm_user' && (
                <div className="space-y-2">
                  <Label htmlFor="invite-firm">Firm</Label>
                  <Select value={inviteFirmId} onValueChange={setInviteFirmId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a firm..." />
                    </SelectTrigger>
                    <SelectContent>
                      {firms.map(firm => (
                        <SelectItem key={firm.id} value={firm.id}>
                          {firm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {firms.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No firms available. Create a firm first.
                    </p>
                  )}
                </div>
              )}

              <Button 
                onClick={handleGenerateInvite} 
                disabled={inviteLoading}
                className="w-full"
              >
                {inviteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Invite Link
              </Button>

              {generatedLink && (
                <div className="mt-4 space-y-2 rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Invitation Link</span>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="mr-1 h-3 w-3" />
                      Expires {linkExpiry ? formatDate(linkExpiry) : '7 days'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      value={generatedLink} 
                      readOnly 
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyLink}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share this link with the user via your preferred email method.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Invitations that have not been accepted yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingInvitations.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No pending invitations
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingInvitations.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{inv.email}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
                            {inv.role}
                          </Badge>
                          <span>Expires {formatDate(inv.expires_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Users Section */}
      {activeSection === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Users who have accepted invitations and have accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No users found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Firm</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Sign In</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {u.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {u.roles.map(role => (
                            <Badge key={role} variant={role === 'admin' ? 'default' : 'secondary'}>
                              {role}
                            </Badge>
                          ))}
                          {u.roles.length === 0 && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{u.firm_name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(u.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.last_sign_in_at ? formatDate(u.last_sign_in_at) : 'Never'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Firms Section */}
      {activeSection === 'firms' && (
        <Card>
          <CardHeader>
            <CardTitle>Firm Management</CardTitle>
            <CardDescription>
              Create and manage law firms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="py-8 text-center text-sm text-muted-foreground">
              Firm management coming in next phase
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data Management Section */}
      {activeSection === 'data' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Seed Synthetic Data</CardTitle>
              <CardDescription>
                Generate 5,000 synthetic Medicare-style providers with realistic distributions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will clear any existing provider data and generate new deterministic synthetic data 
                with log-normal payment distributions for Phase 2 testing.
              </p>
              <Button onClick={handleSeedData} disabled={seedLoading} className="w-full">
                {seedLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Seed Synthetic Data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recompute Anomalies</CardTitle>
              <CardDescription>
                Run the anomaly detection algorithm on current provider data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Flags providers at ≥99.5th percentile rank within their peer group (specialty + state) 
                for both 2023 and 2024.
              </p>
              <Button onClick={handleRecomputeAnomalies} disabled={recomputeLoading} className="w-full">
                {recomputeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <RefreshCw className="mr-2 h-4 w-4" />
                Recompute Anomalies
              </Button>
              {lastComputeStats && (
                <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                  <p><strong>Last Run:</strong></p>
                  <p>Providers analyzed: {lastComputeStats.providers.toLocaleString()}</p>
                  <p>Peer groups: {lastComputeStats.peerGroups}</p>
                  <p>Providers flagged: {lastComputeStats.flagged}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Audit Logs Section */}
      {activeSection === 'audit' && (
        <Card>
          <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>
              View system activity and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="py-8 text-center text-sm text-muted-foreground">
              Audit log viewer coming in next phase
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Admin Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current Admin</CardTitle>
          <CardDescription>
            Your admin account details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Email:</span>
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">User ID:</span>
              <code className="rounded bg-muted px-2 py-1 text-xs">{user?.id}</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
