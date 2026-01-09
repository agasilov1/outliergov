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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Shield, Users, Building2, FileText, Copy, Check, Loader2, UserPlus, Database, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Plus, Eye, EyeOff, Trash2, Lock, Unlock } from 'lucide-react';

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
  expired?: boolean;
  expired_reason?: string | null;
  user_count?: number;
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

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  user_email?: string;
  user_firm_id?: string | null;
  user_firm_name?: string | null;
}

const PROTECTED_ADMIN_EMAIL = 'arifgasilov123@gmail.com';

export default function Admin() {
  const { user, session } = useAuth();
  
  const isProtectedUser = (userEmail: string) => {
    return userEmail.toLowerCase() === PROTECTED_ADMIN_EMAIL.toLowerCase();
  };
  const [activeSection, setActiveSection] = useState<'users' | 'firms' | 'data' | 'audit'>('users');
  
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
  
  // Create user form state
  const [createUserEmail, setCreateUserEmail] = useState('');
  const [createUserName, setCreateUserName] = useState('');
  const [createUserRole, setCreateUserRole] = useState<'admin' | 'firm_user'>('firm_user');
  const [createUserFirmId, setCreateUserFirmId] = useState<string>('');
  const [createUserLoading, setCreateUserLoading] = useState(false);
  
  // Generated password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [createdUserEmail, setCreatedUserEmail] = useState('');
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Create firm state
  const [newFirmName, setNewFirmName] = useState('');
  const [createFirmLoading, setCreateFirmLoading] = useState(false);

  // User action states
  const [expiringUserId, setExpiringUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Firm action states
  const [expiringFirmId, setExpiringFirmId] = useState<string | null>(null);
  const [deletingFirmId, setDeletingFirmId] = useState<string | null>(null);
  const [firmToDelete, setFirmToDelete] = useState<Firm | null>(null);

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Recompute safety lock
  const [recomputeLocked, setRecomputeLocked] = useState(true);
  
  // Audit log state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditFilterUser, setAuditFilterUser] = useState<string>('all');
  const [auditFilterFirm, setAuditFilterFirm] = useState<string>('all');
  const [auditFilterAction, setAuditFilterAction] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [session]);

  useEffect(() => {
    if (activeSection === 'audit' && users.length > 0) {
      loadAuditLogs();
    }
  }, [activeSection, users]);

  async function loadData() {
    if (!session) return;
    
    setLoadingData(true);
    try {
      // Load firms with expiration data
      const { data: firmsData } = await supabase
        .from('firms')
        .select('id, name, created_at, expired, expired_reason')
        .order('name');
      
      // Count users per firm
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('firm_id');
      
      const firmUserCounts: Record<string, number> = {};
      profilesData?.forEach(p => {
        if (p.firm_id) {
          firmUserCounts[p.firm_id] = (firmUserCounts[p.firm_id] || 0) + 1;
        }
      });

      setFirms((firmsData || []).map(f => ({
        ...f,
        user_count: firmUserCounts[f.id] || 0
      })));

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

  async function handleCreateUser() {
    if (!createUserEmail || !createUserEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (createUserRole === 'firm_user' && !createUserFirmId) {
      toast.error('Please select a firm for firm users');
      return;
    }

    setCreateUserLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { 
          email: createUserEmail, 
          full_name: createUserName || null,
          role: createUserRole, 
          firm_id: createUserRole === 'firm_user' ? createUserFirmId : null 
        }
      });
      
      if (error || data?.error) throw new Error(data?.error || 'Failed to create user');
      
      // Show password modal
      setGeneratedPassword(data.generated_password);
      setCreatedUserEmail(data.email);
      setShowPasswordModal(true);
      setPasswordCopied(false);
      setShowPassword(false);
      
      // Reset form
      setCreateUserEmail('');
      setCreateUserName('');
      setCreateUserRole('firm_user');
      setCreateUserFirmId('');
      
      toast.success('User created successfully!');
      loadData();
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreateUserLoading(false);
    }
  }

  async function handleCopyPassword() {
    await navigator.clipboard.writeText(generatedPassword);
    setPasswordCopied(true);
    toast.success('Password copied to clipboard!');
    setTimeout(() => setPasswordCopied(false), 3000);
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

  async function handleDeleteUser() {
    if (!userToDelete) return;
    
    setDeletingUserId(userToDelete.id);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userToDelete.id }
      });
      
      if (error || data?.error) throw new Error(data?.error || 'Failed to delete user');
      
      toast.success(`User ${userToDelete.email} deleted`);
      setUserToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  }

  async function handleToggleFirmExpired(firmId: string, currentExpired: boolean) {
    setExpiringFirmId(firmId);
    try {
      const { error } = await supabase
        .from('firms')
        .update({ 
          expired: !currentExpired,
          expired_reason: !currentExpired ? 'Firm access expired by admin' : null,
          expired_at: !currentExpired ? new Date().toISOString() : null
        })
        .eq('id', firmId);
      
      if (error) throw error;
      toast.success(currentExpired ? 'Firm access restored' : 'Firm access expired');
      loadData();
    } catch (error) {
      console.error('Error updating firm:', error);
      toast.error('Failed to update firm status');
    } finally {
      setExpiringFirmId(null);
    }
  }

  async function handleDeleteFirm() {
    if (!firmToDelete) return;
    
    setDeletingFirmId(firmToDelete.id);
    try {
      // First, unassign users from this firm
      const { error: unassignError } = await supabase
        .from('profiles')
        .update({ firm_id: null })
        .eq('firm_id', firmToDelete.id);
      
      if (unassignError) {
        console.error('Error unassigning users:', unassignError);
      }
      
      // Then delete the firm
      const { error } = await supabase
        .from('firms')
        .delete()
        .eq('id', firmToDelete.id);
      
      if (error) throw error;
      
      toast.success(`Firm "${firmToDelete.name}" deleted`);
      setFirmToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting firm:', error);
      toast.error('Failed to delete firm');
    } finally {
      setDeletingFirmId(null);
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
      setRecomputeLocked(true); // Re-lock after completion
    }
  }

  async function loadAuditLogs() {
    setAuditLogsLoading(true);
    try {
      const { data: logs, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      
      const enrichedLogs = (logs || []).map(log => {
        const logUser = users.find(u => u.id === log.user_id);
        return {
          ...log,
          metadata: log.metadata as Record<string, unknown> | null,
          user_email: logUser?.email || 'Unknown',
          user_firm_id: logUser?.firm_name ? firms.find(f => f.name === logUser.firm_name)?.id : null,
          user_firm_name: logUser?.firm_name || null,
        };
      });
      
      setAuditLogs(enrichedLogs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setAuditLogsLoading(false);
    }
  }

  const filteredAuditLogs = auditLogs.filter(log => {
    if (auditFilterUser !== 'all' && log.user_id !== auditFilterUser) return false;
    if (auditFilterFirm !== 'all' && log.user_firm_id !== auditFilterFirm) return false;
    if (auditFilterAction !== 'all' && log.action !== auditFilterAction) return false;
    return true;
  });

  const uniqueActions = [...new Set(auditLogs.map(l => l.action))].sort();

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  const isSyntheticDataset = (release: DatasetRelease) => {
    return release.dataset_key?.toLowerCase().includes('synthetic') || 
           release.release_label?.toLowerCase().includes('synthetic') ||
           release.release_label?.toLowerCase().includes('demo');
  };

  const activeDataset = datasetReleases.find(r => r.status === 'active');

  return (
    <div className="space-y-6">
      {/* Password Display Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              User Created Successfully
            </DialogTitle>
            <DialogDescription>
              Share this temporary password with the user. They will be required to change it on first login.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span><strong>Important:</strong> Copy this password now. It will not be shown again.</span>
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">
                {createdUserEmail}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    type={showPassword ? 'text' : 'password'}
                    value={generatedPassword} 
                    readOnly 
                    className="font-mono pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleCopyPassword}
                  className={passwordCopied ? 'border-green-500 text-green-500' : ''}
                >
                  {passwordCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <Button 
              onClick={() => setShowPasswordModal(false)} 
              className="w-full"
              disabled={!passwordCopied}
            >
              {passwordCopied ? 'Done' : 'Copy password first to continue'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Modal */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {userToDelete && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
              <p className="font-medium">{userToDelete.email}</p>
              {userToDelete.full_name && <p className="text-sm text-muted-foreground">{userToDelete.full_name}</p>}
              {userToDelete.firm_name && <p className="text-sm text-muted-foreground">Firm: {userToDelete.firm_name}</p>}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser}
              disabled={deletingUserId === userToDelete?.id}
            >
              {deletingUserId === userToDelete?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Firm Confirmation Modal */}
      <Dialog open={!!firmToDelete} onOpenChange={(open) => !open && setFirmToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Firm
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this firm? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {firmToDelete && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="font-medium">{firmToDelete.name}</p>
                {firmToDelete.user_count && firmToDelete.user_count > 0 && (
                  <p className="text-sm text-muted-foreground">{firmToDelete.user_count} user(s) assigned</p>
                )}
              </div>
              
              {firmToDelete.user_count && firmToDelete.user_count > 0 && (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>This firm has {firmToDelete.user_count} user(s). They will be unassigned from the firm but their accounts will remain.</span>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setFirmToDelete(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteFirm}
              disabled={deletingFirmId === firmToDelete?.id}
            >
              {deletingFirmId === firmToDelete?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Firm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <Badge className="bg-accent text-accent-foreground"><Shield className="mr-1 h-3 w-3" />Admin Only</Badge>
        </div>
        <p className="text-muted-foreground">Manage users, firms, and system settings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(['users', 'firms', 'data', 'audit'] as const).map(section => (
          <Card key={section} className={`cursor-pointer transition-colors ${activeSection === section ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => setActiveSection(section)}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {section === 'users' && <><Users className="h-5 w-5 text-accent" />Users ({users.length})</>}
                {section === 'firms' && <><Building2 className="h-5 w-5 text-accent" />Firms ({firms.length})</>}
                {section === 'data' && <><Database className="h-5 w-5 text-accent" />Data Management</>}
                {section === 'audit' && <><FileText className="h-5 w-5 text-accent" />Audit Logs</>}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {activeSection === 'users' && (
        <div className="space-y-6">
          {/* Create User Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create New User
              </CardTitle>
              <CardDescription>Create a user account with a generated password. The user must change their password on first login.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2 lg:col-span-2">
                  <Label>Email Address</Label>
                  <Input 
                    type="email" 
                    placeholder="user@example.com" 
                    value={createUserEmail} 
                    onChange={e => setCreateUserEmail(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Full Name (optional)</Label>
                  <Input 
                    placeholder="John Doe" 
                    value={createUserName} 
                    onChange={e => setCreateUserName(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={createUserRole} onValueChange={v => setCreateUserRole(v as 'admin' | 'firm_user')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="firm_user">Firm User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {createUserRole === 'firm_user' && (
                  <div className="space-y-2">
                    <Label>Firm</Label>
                    <Select value={createUserFirmId} onValueChange={setCreateUserFirmId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select firm..." />
                      </SelectTrigger>
                      <SelectContent>
                        {firms.filter(f => !f.expired).map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className={`flex items-end ${createUserRole === 'admin' ? '' : ''}`}>
                  <Button 
                    onClick={handleCreateUser} 
                    disabled={createUserLoading} 
                    className="w-full"
                  >
                    {createUserLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Manage user access. Expired users cannot access the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Firm</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => (
                      <TableRow key={u.id} className={u.expired ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{u.email}</span>
                            {u.full_name && <span className="text-xs text-muted-foreground">{u.full_name}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {u.roles.map(r => <Badge key={r} variant={r === 'admin' ? 'default' : 'secondary'}>{r}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell>{u.firm_name || '—'}</TableCell>
                        <TableCell>
                          {u.expired ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-600">Expired</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-3">
                            <div className="flex items-center gap-2">
                            <Switch
                                checked={u.expired || false}
                                onCheckedChange={() => handleToggleExpired(u.id, u.expired || false)}
                                disabled={expiringUserId === u.id || u.id === user?.id || isProtectedUser(u.email)}
                              />
                              <span className={`text-xs font-medium ${u.expired ? 'text-amber-600' : 'text-green-600'}`}>
                                {expiringUserId === u.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : u.expired ? 'Expired' : 'Active'}
                              </span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setUserToDelete(u)}
                              disabled={u.id === user?.id || isProtectedUser(u.email)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === 'firms' && (
        <div className="space-y-6">
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
            <CardHeader>
              <CardTitle>All Firms</CardTitle>
              <CardDescription>Manage firm access. Expired firms block all their users from the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : firms.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No firms created yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {firms.map(f => (
                      <TableRow key={f.id} className={f.expired ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell>{f.user_count || 0}</TableCell>
                        <TableCell>
                          {f.expired ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-600">Expired</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{f.created_at ? formatDate(f.created_at) : '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={f.expired || false}
                                onCheckedChange={() => handleToggleFirmExpired(f.id, f.expired || false)}
                                disabled={expiringFirmId === f.id}
                              />
                              <span className={`text-xs font-medium ${f.expired ? 'text-amber-600' : 'text-green-600'}`}>
                                {expiringFirmId === f.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : f.expired ? 'Expired' : 'Active'}
                              </span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setFirmToDelete(f)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
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
            <CardHeader>
              <CardTitle>Recompute Anomalies</CardTitle>
              <CardDescription>Run anomaly detection on current data using the Top 0.5% threshold</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                  <Switch
                    checked={!recomputeLocked}
                    onCheckedChange={(checked) => setRecomputeLocked(!checked)}
                  />
                  {recomputeLocked ? (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4" /> Safety Lock
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm text-amber-600 font-medium">
                      <Unlock className="h-4 w-4" /> Unlocked
                    </span>
                  )}
                </div>
                <Button 
                  onClick={handleRecomputeAnomalies} 
                  disabled={recomputeLoading || recomputeLocked}
                  className={recomputeLocked ? 'opacity-50' : ''}
                >
                  {recomputeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recompute Anomalies
                </Button>
              </div>
              {recomputeLocked && (
                <p className="text-xs text-muted-foreground">Toggle the safety lock to enable the recompute button</p>
              )}
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
          <Card><CardHeader><CardTitle>Dataset Releases</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Label</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Ingested</TableHead></TableRow></TableHeader><TableBody>{datasetReleases.map(r => <TableRow key={r.id} className={r.status === 'active' ? 'bg-muted/30' : ''}><TableCell className="font-medium">{r.release_label}</TableCell><TableCell>{isSyntheticDataset(r) ? <Badge variant="outline" className="text-amber-600 border-amber-600">Demo</Badge> : <Badge variant="outline" className="text-green-600 border-green-600">CMS</Badge>}</TableCell><TableCell><Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{r.ingested_at ? formatDate(r.ingested_at) : '—'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
          <Card><CardHeader><CardTitle>Compute History</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Version</TableHead><TableHead>Started</TableHead></TableRow></TableHeader><TableBody>{computeRuns.map(r => <TableRow key={r.id}><TableCell>{r.run_type}</TableCell><TableCell>{r.status === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : r.status === 'failed' ? <XCircle className="h-4 w-4 text-destructive" /> : <Loader2 className="h-4 w-4 animate-spin" />}</TableCell><TableCell className="font-mono text-xs">{r.rule_set_version}</TableCell><TableCell className="text-sm text-muted-foreground">{r.started_at ? formatDate(r.started_at) : '—'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        </div>
      )}

      {activeSection === 'audit' && (
        <div className="space-y-6">
          {/* Filters Card */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter audit logs by user, firm, or action type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>User</Label>
                  <Select value={auditFilterUser} onValueChange={setAuditFilterUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Firm</Label>
                  <Select value={auditFilterFirm} onValueChange={setAuditFilterFirm}>
                    <SelectTrigger>
                      <SelectValue placeholder="All firms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Firms</SelectItem>
                      {firms.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Action Type</Label>
                  <Select value={auditFilterAction} onValueChange={setAuditFilterAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      {uniqueActions.map(action => (
                        <SelectItem key={action} value={action}>{action.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Audit Logs</span>
                <Badge variant="outline">{filteredAuditLogs.length} entries</Badge>
              </CardTitle>
              <CardDescription>
                Complete activity history for all users on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogsLoading ? (
                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              ) : filteredAuditLogs.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No audit logs found matching the filters
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Firm</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {log.created_at ? formatDate(log.created_at) : '—'}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{log.user_email}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {log.user_firm_name || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {log.action.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.entity_type && (
                            <span>
                              {log.entity_type}: <code className="text-xs bg-muted px-1 rounded">{log.entity_id?.slice(0, 8)}...</code>
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <code className="text-xs bg-muted px-2 py-1 rounded block max-w-[200px] truncate">
                              {JSON.stringify(log.metadata)}
                            </code>
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
      )}

      <Card><CardHeader><CardTitle>Current Admin</CardTitle></CardHeader><CardContent><div className="space-y-2"><div className="flex items-center gap-2"><span className="text-sm font-medium">Email:</span><span className="text-sm text-muted-foreground">{user?.email}</span></div><div className="flex items-center gap-2"><span className="text-sm font-medium">User ID:</span><code className="rounded bg-muted px-2 py-1 text-xs">{user?.id}</code></div></div></CardContent></Card>
    </div>
  );
}
