import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Receipt, FileText, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PortalLayoutProps {
  children: React.ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const { user, signOut } = useAuth();
  const { isPrestador } = useUserRole();
  const navigate = useNavigate();

  const items = [
    { title: 'Início', url: '/portal', icon: Home, end: true },
    { title: 'Reembolsos', url: '/portal/reembolsos', icon: Receipt },
    ...(isPrestador ? [{ title: 'Notas Fiscais', url: '/portal/notas-fiscais', icon: FileText }] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/favicon-ampersand-black.png" alt="A&EIGHT" className="w-8 h-8" />
            <div>
              <h1 className="font-semibold text-foreground leading-tight">Portal A&EIGHT</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-2">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {items.map((it) => (
            <NavLink
              key={it.url}
              to={it.url}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )
              }
            >
              <it.icon className="h-4 w-4" />
              {it.title}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  );
}
