import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Building2, FileText } from 'lucide-react';

export default function Admin() {
  const { user } = useAuth();

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              User Management
            </CardTitle>
            <CardDescription>
              Invite users, assign roles, manage access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming in Phase 3
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent" />
              Firm Management
            </CardTitle>
            <CardDescription>
              Create and manage law firms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming in Phase 3
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              Audit Logs
            </CardTitle>
            <CardDescription>
              View system activity and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming in Phase 3
            </p>
          </CardContent>
        </Card>
      </div>

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
