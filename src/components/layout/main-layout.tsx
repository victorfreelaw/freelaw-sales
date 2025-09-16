import { ReactNode } from 'react';
import { Sidebar } from './sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  // Fake user for frontend testing
  const user = {
    id: 'fake-user-id',
    fullName: 'João Silva',
    email: 'joao@freelaw.com',
    role: 'admin',
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} />
      
      <div className="lg:pl-72">
        <main className="py-8">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}