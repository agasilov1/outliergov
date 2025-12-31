import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DisclaimerBanner } from './DisclaimerBanner';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  BookOpen,
  Database,
  Shield,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Methodology', href: '/methodology', icon: BookOpen },
  { name: 'Data Sources', href: '/data-sources', icon: Database },
];

const adminNavigation = [
  { name: 'Admin Panel', href: '/admin', icon: Shield },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <DisclaimerBanner />
      
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col bg-sidebar lg:flex">
          <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <span className="text-lg font-bold text-sidebar-primary-foreground">O</span>
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground">OutlierGov</span>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}

            {isAdmin && (
              <>
                <div className="my-4 border-t border-sidebar-border" />
                {adminNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                      {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          <div className="border-t border-sidebar-border p-4">
            <div className="mb-3 truncate text-sm text-sidebar-foreground/70">
              {user?.email}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="flex flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">O</span>
              </div>
              <span className="text-lg font-semibold">OutlierGov</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </header>

          {/* Mobile navigation */}
          <nav className="flex gap-1 overflow-x-auto border-b bg-card px-4 py-2 lg:hidden">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
            {isAdmin && adminNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Main content */}
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t bg-card px-6 py-4">
            <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
              <p>© {new Date().getFullYear()} OutlierGov. All rights reserved.</p>
              <div className="flex gap-4">
                <Link to="/privacy" className="hover:text-foreground hover:underline">
                  Privacy Policy
                </Link>
                <Link to="/terms" className="hover:text-foreground hover:underline">
                  Terms of Service
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
