import { createClient } from './supabase-server';
import { User } from '@/types/database';

export async function getCurrentUser(): Promise<User | null> {
  // Para desenvolvimento com dev-store, retornar usuário mock
  if (process.env.DEV_STORE_ENABLED === 'true') {
    return {
      id: 'dev_user_1',
      email: 'dev@freelaw.com.br',
      fullName: 'Usuário Dev',
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as User;
  }

  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  // Fetch user data from our users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    return null;
  }

  return userData as User;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

export async function requireRole(requiredRoles: string[]): Promise<User> {
  const user = await requireAuth();
  
  if (!requiredRoles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }
  
  return user;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}