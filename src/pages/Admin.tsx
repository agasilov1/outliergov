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
import { Shield, Users, Building2, FileText, Copy, Check, Loader2, UserPlus, Clock, Mail, Database, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Plus, UserX, UserCheck } from 'lucide-react';

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
  expired?: boolean;
}

interface Firm {
  id: string;
  name: string;
  created_at?: string;
}

interface ComputeRun {
  id: string;
  run_type: string;
  status: string;
  rule_set_version: string;
  started_at: string | null;
  finished_at: string | null;
  parameters_json: unknown;
  error_message: string | null;
}

interface DatasetRelease {
  id: string;
  release_label: string;
  dataset_key: string;
  status: string;
  ingested_at: string | null;
}

export default function Admin() {
  const { user, session } = useAuth();
  const [activeSection, setActiveSection] = useState<'invite' | 'users' | 'firms' | 'data' | 'audit'>('invite');
  
  // Data management state
  const [recomputeLoading, setRecomputeLoading] = useState(false);
  const [lastComputeStats, setLastComputeStats] = useState<{
    providers: number;
    flagged: number;
    peerGroups: number;
    computeRunId: string | null;
  } | null>(null);
  const [computeRuns, setComputeRuns] = useState<ComputeRun[]>([]);
  const [datasetReleases, setDatasetReleases] = useState<DatasetRelease[]>([]);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'firm_user'>('firm_user');
  const [inviteFirmId, setInviteFirmId] = useState<string>('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkExpiry, setLinkExpiry] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Create firm state
  const [newFirmName, setNewFirmName] = useState('');
  const [createFirmLoading, setCreateFirmLoading] = useState(false);

  // User expiration state
  const [expiringUserId, setExpiringUserId] = useState<string | null>(null);

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
      const { data: firmsData } = await supabase.from('firms').select('id, name, created_at').order('name');
      setFirms(firmsData || []);

      const { data: invitationsData } = await supabase.from('invitations').select('*').order('created_at', { ascending: false });
      setInvitations(invitationsData || []);

      const { data, error } = await supabase.functions.invoke('list-users');
      if (!error) setUsers(data?.users || []);

      const { data: releases } = await supabase.from('dataset_releases').select('*').order('ingested_at', { ascending: false }).limit(10);
      setDatasetReleases(releases || []);

      const { data: runs } = await supabase.from('compute_runs').select('*').order('started_at', { ascending: false }).limit(10);
      setComputeRuns(runs || []);
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
        body: { email: inviteEmail, role: inviteRole, firm_id: inviteRole === 'firm_user' ? inviteFirmId : null }
      });
      if (error || data?.error) throw new Error(data?.error || 'Failed');
      setGeneratedLink(data.invite_url);
      setLinkExpiry(data.expires_at);
      toast.success('Invitation link generated!');
      loadData();
    } catch {
      toast.error('Failed to generate invitation');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCreateFirm() {
    if (!newFirmName.trim()) {
      toast.error('Please enter a firm name');
      return;
    }

    setCreateFirmLoading(true);
    try {
      const { error } = await supabase.from('firms').insert({ name: newFirmName.trim() });
      if (error) throw error;
      toast.success('Firm created successfully!');
      setNewFirmName('');
      loadData();
    } catch (error) {
      console.error('Error creating firm:', error);
      toast.error('Failed to create firm');
    } finally {
      setCreateFirmLoading(false);
    }
  }

  async function handleToggleExpired(userId: string, currentExpired: boolean) {
    setExpiringUserId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          expired: !currentExpired,
          expired_reason: !currentExpired ? 'Account expired by admin' : null
        })
        .eq('id', userId);
      
      if (error) throw error;
      toast.success(currentExpired ? 'User access restored' : 'User access expired');
      loadData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user status');
    } finally {
      setExpiringUserId(null);
    }
  }

  async function handleRecomputeAnomalies() {
    setRecomputeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('recompute-anomalies');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLastComputeStats({
        providers: data.results?.providers_analyzed || 0,
        flagged: data.results?.providers_flagged || 0,
        peerGroups: data.results?.peer_groups_analyzed || 0,
        computeRunId: data.compute_run_id
      });
      toast.success(`Flagged ${data.results?.providers_flagged || 0} providers`);
      loadData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to recompute');
    } finally {
      setRecomputeLoading(false);
    }
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();
  const pendingInvitations = invitations.filter(i => !i.accepted_at && !isExpired(i.expires_at));
  
  const isSyntheticDataset = (release: DatasetRelease) => {
    return release.dataset_key?.toLowerCase().includes('synthetic') || 
           release.release_label?.toLowerCase().includes('synthetic') ||
           release.release_label?.toLowerCase().includes('demo');
  };

  const activeDataset = datasetReleases.find(r => r.status === 'active');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <Badge className="bg-accent text-accent-foreground"><Shield className="mr-1 h-3 w-3" />Admin Only</Badge>
        </div>
        <p className="text-muted-foreground">Manage users, firms, and system settings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {(['invite', 'users', 'firms', 'data', 'audit'] as const).map(section => (
          <Card key={section} className={`cursor-pointer transition-colors ${activeSection === section ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => setActiveSection(section)}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {section === 'invite' && <><UserPlus className="h-5 w-5 text-accent" />Invite Users</>}
                {section === 'users' && <><Users className="h-5 w-5 text-accent" />All Users ({users.length})</>}
                {section === 'firms' && <><Building2 className="h-5 w-5 text-accent" />Firms ({firms.length})</>}
                {section === 'data' && <><Database className="h-5 w-5 text-accent" />Data Management</>}
                {section === 'audit' && <><FileText className="h-5 w-5 text-accent" />Audit Logs</>}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {activeSection === 'invite' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Generate Invitation Link</CardTitle><CardDescription>Create a magic link to invite a new user.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Email Address</Label><Input type="email" placeholder="user@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /></div>
              <div className="space-y-2"><Label>Role</Label><Select value={inviteRole} onValueChange={v => setInviteRole(v as 'admin' | 'firm_user')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="firm_user">Firm User</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div>
              {inviteRole === 'firm_user' && <div className="space-y-2"><Label>Firm</Label><Select value={inviteFirmId} onValueChange={setInviteFirmId}><SelectTrigger><SelectValue placeholder="Select a firm..." /></SelectTrigger><SelectContent>{firms.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select></div>}
              <Button onClick={handleGenerateInvite} disabled={inviteLoading} className="w-full">{inviteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generate Invite Link</Button>
              {generatedLink && <div className="mt-4 space-y-2 rounded-lg border bg-muted/50 p-4"><div className="flex items-center justify-between"><span className="text-sm font-medium">Invitation Link</span><Badge variant="outline" className="text-xs"><Clock className="mr-1 h-3 w-3" />Expires {linkExpiry ? formatDate(linkExpiry) : '7 days'}</Badge></div><div className="flex gap-2"><Input value={generatedLink} readOnly className="font-mono text-xs" /><Button variant="outline" size="icon" onClick={handleCopyLink}>{copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></div></div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Pending Invitations</CardTitle></CardHeader>
            <CardContent>{loadingData ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : pendingInvitations.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No pending invitations</p> : <div className="space-y-3">{pendingInvitations.map(inv => <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{inv.email}</p><div className="flex items-center gap-2 text-xs text-muted-foreground"><Badge variant="secondary" className="text-xs">{inv.role}</Badge><span>Expires {formatDate(inv.expires_at)}</span></div></div></div>)}</div>}</CardContent>
          </Card>
        </div>
      )}

      {activeSection === 'users' && (
        <Card>
          <CardHeader><CardTitle>All Users</CardTitle><CardDescription>Manage user access. Expired users cannot access the platform.</CardDescription></CardHeader>
          <CardContent>{loadingData ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : <Table><TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Roles</TableHead><TableHead>Firm</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{users.map(u => <TableRow key={u.id} className={u.expired ? 'opacity-60' : ''}><TableCell><div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{u.email}</div></TableCell><TableCell><div className="flex gap-1">{u.roles.map(r => <Badge key={r} variant={r === 'admin' ? 'default' : 'secondary'}>{r}</Badge>)}</div></TableCell><TableCell>{u.firm_name || '—'}</TableCell><TableCell>{u.expired ? <Badge variant="outline" className="text-amber-600 border-amber-600">Expired</Badge> : <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>}</TableCell><TableCell className="text-sm text-muted-foreground">{formatDate(u.created_at)}</TableCell><TableCell className="text-right"><Button variant={u.expired ? 'outline' : 'destructive'} size="sm" onClick={() => handleToggleExpired(u.id, u.expired || false)} disabled={expiringUserId === u.id}>{expiringUserId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : u.expired ? <><UserCheck className="h-4 w-4 mr-1" />Restore</> : <><UserX className="h-4 w-4 mr-1" />Expire</>}</Button></TableCell></TableRow>)}</TableBody></Table>}</CardContent>
        </Card>
      )}

      {activeSection === 'firms' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Create New Firm</CardTitle><CardDescription>Add a new firm to the platform.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Firm Name</Label>
                <Input placeholder="Enter firm name..." value={newFirmName} onChange={e => setNewFirmName(e.target.value)} />
              </div>
              <Button onClick={handleCreateFirm} disabled={createFirmLoading} className="w-full">
                {createFirmLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create Firm
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Existing Firms</CardTitle></CardHeader>
            <CardContent>
              {loadingData ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : firms.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No firms created yet</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {firms.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{f.created_at ? formatDate(f.created_at) : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === 'data' && (
        <div className="space-y-6">
          {activeDataset && (
            <Card className={isSyntheticDataset(activeDataset) ? "border-amber-500/50" : "border-green-500/50"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />Active Dataset
                  {isSyntheticDataset(activeDataset) ? <Badge variant="outline" className="text-amber-600 border-amber-600"><AlertTriangle className="h-3 w-3 mr-1" />Demo / Synthetic</Badge> : <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Production</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div><p className="text-sm text-muted-foreground">Dataset</p><p className="font-medium">{activeDataset.release_label}</p></div>
                  <div><p className="text-sm text-muted-foreground">Ingested</p><p className="font-medium">{activeDataset.ingested_at ? formatDate(activeDataset.ingested_at) : '—'}</p></div>
                  <div><p className="text-sm text-muted-foreground">Source</p><p className="font-medium">{isSyntheticDataset(activeDataset) ? 'Synthetic Data Generator' : 'CMS Public Use Files'}</p></div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>Recompute Anomalies</CardTitle><CardDescription>Run anomaly detection on current data using the Top 0.5% threshold</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleRecomputeAnomalies} disabled={recomputeLoading} className="w-full">{recomputeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<RefreshCw className="mr-2 h-4 w-4" />Recompute Anomalies</Button>
              {lastComputeStats && <div className="rounded-lg border bg-muted/50 p-3 text-sm"><p><strong>Last Run:</strong></p><p>Providers analyzed: {lastComputeStats.providers.toLocaleString()}</p><p>Peer groups: {lastComputeStats.peerGroups}</p><p>Providers flagged: {lastComputeStats.flagged}</p></div>}
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Dataset Releases</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Label</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Ingested</TableHead></TableRow></TableHeader><TableBody>{datasetReleases.map(r => <TableRow key={r.id} className={r.status === 'active' ? 'bg-muted/30' : ''}><TableCell className="font-medium">{r.release_label}</TableCell><TableCell>{isSyntheticDataset(r) ? <Badge variant="outline" className="text-amber-600 border-amber-600">Demo</Badge> : <Badge variant="outline" className="text-green-600 border-green-600">CMS</Badge>}</TableCell><TableCell><Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{r.ingested_at ? formatDate(r.ingested_at) : '—'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
          <Card><CardHeader><CardTitle>Compute History</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Version</TableHead><TableHead>Started</TableHead></TableRow></TableHeader><TableBody>{computeRuns.map(r => <TableRow key={r.id}><TableCell>{r.run_type}</TableCell><TableCell>{r.status === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : r.status === 'failed' ? <XCircle className="h-4 w-4 text-destructive" /> : <Loader2 className="h-4 w-4 animate-spin" />}</TableCell><TableCell className="font-mono text-xs">{r.rule_set_version}</TableCell><TableCell className="text-sm text-muted-foreground">{r.started_at ? formatDate(r.started_at) : '—'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        </div>
      )}

      {activeSection === 'audit' && <Card><CardHeader><CardTitle>Audit Logs</CardTitle></CardHeader><CardContent><p className="py-8 text-center text-sm text-muted-foreground">Coming soon</p></CardContent></Card>}

      <Card><CardHeader><CardTitle>Current Admin</CardTitle></CardHeader><CardContent><div className="space-y-2"><div className="flex items-center gap-2"><span className="text-sm font-medium">Email:</span><span className="text-sm text-muted-foreground">{user?.email}</span></div><div className="flex items-center gap-2"><span className="text-sm font-medium">User ID:</span><code className="rounded bg-muted px-2 py-1 text-xs">{user?.id}</code></div></div></CardContent></Card>
    </div>
  );
}
