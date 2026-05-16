import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

export const ADMIN_ROLES = ['admin', 'underwriter', 'sales_rep', 'viewer'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
export type CrmAuthStatus =
  | 'unauthenticated'
  | 'authenticated_missing_profile'
  | 'authenticated_active'
  | 'authenticated_inactive'
  | 'error';

export type CrmAuthErrorKind =
  | 'config_error'
  | 'auth_error'
  | 'rls_denied'
  | 'database_error'
  | 'inactive_user'
  | 'non_admin_user';

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
  status?: CrmAuthStatus;
  errorKind?: CrmAuthErrorKind;
}

export interface CrmAuthState {
  status: CrmAuthStatus;
  user: SupabaseUser | null;
  profile: UserProfile | null;
  role: string | null;
  allowed: boolean;
  reason?: string;
  setupMissing?: boolean;
  errorKind?: CrmAuthErrorKind;
}

export function isAuthorizedAdminRole(role: string | null | undefined): role is AdminRole {
  return ADMIN_ROLES.includes(role as AdminRole);
}

export const ADMIN_LOGIN_ROUTE = '/admin';
export const WEBSITE_ROUTE = '/';

const storageAuthKeyPatterns = [
  /^sb-.+-auth-token$/i,
  /^sb-.+-refresh-token$/i,
  /^sb-.+-access-token$/i,
  /^supabase\./i,
  /supabase/i,
  /gotrue/i,
  /auth-token/i,
  /access_token/i,
  /refresh_token/i,
];

function isAuthStorageKey(key: string) {
  return storageAuthKeyPatterns.some((pattern) => pattern.test(key));
}

function clearAuthKeysFromStorage(storage: Storage) {
  const keysToRemove: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && isAuthStorageKey(key)) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => storage.removeItem(key));
}

export function clearStoredAuthSession() {
  if (typeof window === 'undefined') return;

  try {
    clearAuthKeysFromStorage(window.localStorage);
  } catch (error) {
    console.warn('Unable to clear auth keys from localStorage', error);
  }

  try {
    clearAuthKeysFromStorage(window.sessionStorage);
  } catch (error) {
    console.warn('Unable to clear auth keys from sessionStorage', error);
  }
}

export async function signOutAndClearAuthState(redirectTo = ADMIN_LOGIN_ROUTE) {
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.warn('Supabase global sign out failed, clearing local auth state', error);
    }
  }

  clearStoredAuthSession();

  if (typeof window !== 'undefined') {
    window.location.replace(redirectTo);
  }
}

export async function safeGetCurrentUser() {
  if (!isSupabaseConfigured) {
    return {
      user: null,
      error: new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.'),
    };
  }

  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}

function isMissingSessionError(error: { message?: string; name?: string } | null | undefined) {
  const value = `${error?.name ?? ''} ${error?.message ?? ''}`.toLowerCase();
  return value.includes('session') && (value.includes('missing') || value.includes('not found'));
}

function isRlsDeniedError(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? '';
  return error?.code === '42501' || message.includes('row-level security') || message.includes('permission denied') || message.includes('rls');
}

export async function safeFetchCrmProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,status')
    .eq('id', userId)
    .maybeSingle();

  return { profile: (data ?? null) as UserProfile | null, error };
}

export async function getCrmAuthState(): Promise<CrmAuthState> {
  if (!isSupabaseConfigured) {
    return {
      status: 'error',
      user: null,
      profile: null,
      role: null,
      allowed: false,
      reason: 'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.',
      setupMissing: true,
      errorKind: 'config_error',
    };
  }

  const { user, error: userError } = await safeGetCurrentUser();

  if (!user) {
    return {
      status: 'unauthenticated',
      user: null,
      profile: null,
      role: null,
      allowed: false,
      reason: 'No active Supabase session.',
      errorKind: userError && !isMissingSessionError(userError) ? 'auth_error' : undefined,
    };
  }

  if (userError && !isMissingSessionError(userError)) {
    return {
      status: 'error',
      user,
      profile: null,
      role: null,
      allowed: false,
      reason: userError.message,
      errorKind: 'auth_error',
    };
  }

  const { profile, error } = await safeFetchCrmProfile(user.id);

  if (error) {
    const setupMissing = error.code === '42P01' || /profiles/i.test(error.message);
    return {
      status: 'error',
      user,
      profile: null,
      role: null,
      allowed: false,
      setupMissing,
      reason: setupMissing
        ? 'The profiles table is not available yet. Run the Supabase core schema migration and create an active admin profile.'
        : error.message,
      errorKind: setupMissing ? 'database_error' : isRlsDeniedError(error) ? 'rls_denied' : 'database_error',
    };
  }

  if (!profile) {
    return {
      status: 'authenticated_missing_profile',
      user,
      profile: null,
      role: null,
      allowed: false,
      reason: 'You are signed in, but this account has not been added to the Bypass Solution CRM yet. Please contact an administrator or sign out and use a different account.',
    };
  }

  if (profile.status !== 'active') {
    return {
      status: 'authenticated_inactive',
      user,
      profile,
      role: profile.role,
      allowed: false,
      reason: 'This CRM profile is not active.',
      errorKind: 'inactive_user',
    };
  }

  if (!isAuthorizedAdminRole(profile.role)) {
    return {
      status: 'error',
      user,
      profile,
      role: profile.role,
      allowed: false,
      reason: 'This CRM profile does not have an authorized admin role.',
      errorKind: 'non_admin_user',
    };
  }

  return {
    status: 'authenticated_active',
    user,
    profile,
    role: profile.role,
    allowed: true,
  };
}

export async function getCurrentUserRole(): Promise<RoleCheckResult> {
  const state = await getCrmAuthState();
  return {
    profile: state.profile,
    role: state.role,
    allowed: state.allowed,
    reason: state.reason,
    setupMissing: state.setupMissing,
    status: state.status,
    errorKind: state.errorKind,
  };
}
