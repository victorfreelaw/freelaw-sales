'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FreelawLogo } from '@/components/ui/freelaw-logo';
import { 
  BarChart3, 
  Calendar, 
  Settings, 
  BookOpen, 
  TrendingUp,
  Menu,
  X,
  LogOut
} from 'lucide-react';
// import { signOut } from '@/lib/auth'; // Comentado para evitar import de server function

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    description: 'Visão geral e KPIs'
  },
  {
    name: 'Reuniões',
    href: '/meetings',
    icon: Calendar,
    description: 'Análises de vendas'
  },
  {
    name: 'Playbooks',
    href: '/playbooks',
    icon: BookOpen,
    description: 'Scripts e ICP'
  },
  {
    name: 'Relatórios',
    href: '/reports',
    icon: TrendingUp,
    description: 'Performance e insights'
  },
  {
    name: 'Configurações',
    href: '/settings',
    icon: Settings,
    description: 'Integrações e perfil'
  },
];

interface SidebarProps {
  user?: {
    fullName?: string;
    email: string;
    role: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    // Temporary fake signout for frontend testing
    console.log('Sign out clicked');
    window.location.href = '/auth/login';
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-background px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <Button
          variant="outline"
          size="icon"
          className="-m-2.5"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu className="h-4 w-4" />
          <span className="sr-only">Abrir menu de navegação</span>
        </Button>
        <div className="flex-1">
          <FreelawLogo width={90} height={15} />
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="relative z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="-m-2.5"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Fechar menu</span>
                </Button>
              </div>
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card px-6 pb-2 ring-1 ring-border">
                <div className="flex h-16 shrink-0 items-center">
                  <FreelawLogo width={120} height={20} />
                </div>
                <nav className="flex flex-1 flex-col">
                  <SidebarContent 
                    pathname={pathname} 
                    user={user} 
                    onSignOut={handleSignOut}
                  />
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card px-6 ring-1 ring-border">
          <div className="flex h-16 shrink-0 items-center">
            <FreelawLogo width={140} height={24} />
          </div>
          <nav className="flex flex-1 flex-col">
            <SidebarContent 
              pathname={pathname} 
              user={user} 
              onSignOut={handleSignOut}
            />
          </nav>
        </div>
      </div>
    </>
  );
}

function SidebarContent({ 
  pathname, 
  user, 
  onSignOut 
}: { 
  pathname: string; 
  user?: { fullName?: string; email: string; role: string }; 
  onSignOut: () => void;
}) {
  return (
    <>
      <ul role="list" className="flex flex-1 flex-col gap-y-7">
        <li>
          <ul role="list" className="-mx-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                      'group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-medium transition-colors'
                    )}
                  >
                    <item.icon
                      className="h-5 w-5 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col">
                      <span>{item.name}</span>
                      <span className={cn(
                        "text-xs",
                        isActive 
                          ? "text-primary-foreground/70" 
                          : "text-muted-foreground"
                      )}>
                        {item.description}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      </ul>

      {/* User section */}
      {user && (
        <div className="mt-auto">
          <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-freelaw-primary text-white text-sm">
              {user.fullName?.charAt(0) || user.email.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="truncate font-medium">
                {user.fullName || user.email}
              </div>
              <div className="text-xs text-muted-foreground capitalize">
                {user.role}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSignOut}
              className="h-8 w-8"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Sair</span>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}