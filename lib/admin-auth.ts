'use client';

export type AdminRole = {
  id: number;
  key: string;
  name: string;
} | null;

export type AdminSessionUser = {
  id: number;
  name: string;
  email: string;
  role?: AdminRole;
  permissions?: string[];
  is_super_admin?: boolean;
};

const TOKEN_KEY = 'hakidd_admin_token';
const USER_KEY = 'hakidd_admin_user';

// Sentinel permission that no role is ever granted. Returned for any dashboard
// route/entity not explicitly mapped below so access defaults to deny (a
// super admin still passes via `is_super_admin` in hasAdminPermission).
const DENY_PERMISSION = '__deny__';

const ENTITY_PERMISSION_MAP: Record<
  string,
  {
    read: string;
    write: string;
  }
> = {
  'activity-logs': { read: 'activity_logs.read', write: 'activity_logs.read' },
  'additional-products': { read: 'products.read', write: 'products.write' },
  'admin-users': { read: 'admin_users.read', write: 'admin_users.write' },
  analytics: { read: 'analytics.read', write: 'analytics.write' },
  banners: { read: 'banners.read', write: 'banners.write' },
  catalogues: { read: 'catalogues.read', write: 'catalogues.write' },
  categories: { read: 'categories.read', write: 'categories.write' },
  'class-codes': { read: 'products.read', write: 'products.write' },
  crousals: { read: 'carousel.read', write: 'carousel.write' },
  displays: { read: 'displays.read', write: 'displays.write' },
  faqs: { read: 'faqs.read', write: 'faqs.write' },
  'filter-products': { read: 'products.read', write: 'products.write' },
  'group-products': { read: 'products.read', write: 'products.write' },
  'manage-product-quantity': { read: 'products.read', write: 'products.write' },
  newsletters: { read: 'newsletters.read', write: 'newsletters.write' },
  'on-sale-products': { read: 'products.read', write: 'products.write' },
  orders: { read: 'orders.read', write: 'orders.write' },
  patterns: { read: 'patterns.read', write: 'patterns.write' },
  'pre-orders': { read: 'pre_orders.read', write: 'pre_orders.write' },
  products: { read: 'products.read', write: 'products.write' },
  'product-group-items': { read: 'products.read', write: 'products.write' },
  'search-synonyms': { read: 'search_synonyms.read', write: 'search_synonyms.write' },
  'site-settings': { read: 'site_settings.read', write: 'site_settings.write' },
  'spanish-products': { read: 'products.read', write: 'products.write' },
  'web-users': { read: 'customers.read', write: 'customers.write' },
  dashboard: { read: 'dashboard.read', write: 'dashboard.read' },
};

function normalizePath(pathname: string) {
  return pathname.trim().replace(/\/+$/, '') || '/';
}

function normalizeEntity(value: string) {
  return value.trim().toLowerCase();
}

function getDashboardEntity(pathname: string) {
  const normalized = normalizePath(pathname);

  if (normalized === '/dashboard') {
    return 'dashboard';
  }

  if (!normalized.startsWith('/dashboard/')) {
    return null;
  }

  const [, , entity] = normalized.split('/');
  return entity ? normalizeEntity(entity) : null;
}

export function getStoredAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredAdminUser(): AdminSessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AdminSessionUser;
  } catch {
    return null;
  }
}

export function storeAdminSession(token: string, user: AdminSessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAdminSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function hasAdminPermission(
  user: AdminSessionUser | null | undefined,
  permission: string | null
) {
  if (!permission) {
    return true;
  }

  if (user?.is_super_admin) {
    return true;
  }

  return user?.permissions?.includes(permission) ?? false;
}

export function getEntityPermissions(entity: string) {
  return ENTITY_PERMISSION_MAP[normalizeEntity(entity)] ?? null;
}

export function canReadEntity(user: AdminSessionUser | null | undefined, entity: string) {
  const permissions = getEntityPermissions(entity);
  return hasAdminPermission(user, permissions?.read ?? DENY_PERMISSION);
}

export function canWriteEntity(user: AdminSessionUser | null | undefined, entity: string) {
  const permissions = getEntityPermissions(entity);
  return hasAdminPermission(user, permissions?.write ?? DENY_PERMISSION);
}

export function getRequiredPermissionForPath(pathname: string) {
  const normalized = normalizePath(pathname);

  if (normalized === '/dashboard/forbidden') {
    return null;
  }

  const entity = getDashboardEntity(normalized);
  if (!entity) {
    return null;
  }

  // Unmapped dashboard entities default to deny rather than allow.
  return getEntityPermissions(entity)?.read ?? DENY_PERMISSION;
}

export function canAccessAdminPath(
  pathname: string,
  user: AdminSessionUser | null | undefined
) {
  const requiredPermission = getRequiredPermissionForPath(pathname);
  return hasAdminPermission(user, requiredPermission);
}
