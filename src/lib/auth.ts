import { supabase, isSupabaseConfigured } from './supabase';

export const ADMIN_ROLES = ['admin', 'underwriter', 'sales_rep', 'viewer'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  status: string | null;
}

export interface RoleCheckResult {
  profile: UserProfile | null;
  role: string | null;
  allowed: boolean;
  reason?: string;
  setupMissing?: boolean;
}

export function isAuthorizedAdminRole(role: string | null | undefined): role is AdminRole {
  return ADMIN_ROLES.includes(role as AdminRole);
}

export async function getCurrentUserRole(): Promise<RoleCheckResult> {
  if (!isSupabaseConfigured) {
    return {
      profile: null,
      role: null,
      allowed: false,
      reason: 'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.',
      setupMissing: true,
    };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { profile: null, role: null, allowed: false, reason: 'No active Supabase session.' };
  }

  const readProfile = () => supabase
    .from('profiles')
    .select('id,email,full_name,role,status')
    .eq('id', user.id)
    .maybeSingle();
  const { data: initialProfile, error } = await readProfile();
  let data = initialProfile;

  if (error) {
    const setupMissing = error.code === '42P01' || /profiles/i.test(error.message);
    return {
      profile: null,
      role: null,
      allowed: false,
      setupMissing,
      reason: setupMissing
        ? 'The profiles table is not available yet. Run the Supabase core schema migration and create an active admin profile.'
        : error.message,
    };
  }

  if (!data) {
    const { data: enrolled, error: enrollmentError } = await supabase.rpc('enroll_company_crm_user');
    if (enrollmentError) {
      return { profile: null, role: null, allowed: false, reason: 'Unable to set up your company CRM access. Please try again or contact an admin.' };
    }
    if (enrolled) {
      const result = await readProfile();
      if (result.error) return { profile: null, role: null, allowed: false, reason: result.error.message };
      data = result.data;
    }
    if (!data) return { profile: null, role: null, allowed: false, reason: 'Sign in with your verified @bypasssolution.com account, or ask an admin for an invitation.' };
  }

  if (data.status !== 'active') {
    return { profile: data, role: data.role, allowed: false, reason: 'This CRM profile is not active.' };
  }

  if (!isAuthorizedAdminRole(data.role)) {
    return { profile: data, role: data.role, allowed: false, reason: 'This CRM profile does not have an authorized admin role.' };
  }

  return { profile: data, role: data.role, allowed: true };
}
