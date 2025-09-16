import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { LoginForm } from '@/components/auth/login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirectedFrom?: string };
}) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
            <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
              FreelawSales
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Faça login para acessar sua conta
            </p>
          </div>
          
          <LoginForm redirectTo={searchParams.redirectedFrom} />
        </div>
      </div>
    </div>
  );
}