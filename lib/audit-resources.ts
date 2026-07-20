export type AuditResource = {
  resourceType: string;
  label: string;
};

// Mirrors ENTITY_RESOURCE_TYPE_MAP in node-backend/src/admin/admin-rbac.constants.ts.
// Dashboard pages without an entry (dashboard home, analytics, activity-logs
// itself, forbidden) do not show the audit sidebar.
const AUDIT_RESOURCES: Record<string, AuditResource> = {
  'additional-products': { resourceType: 'additional_products', label: 'Additional Products' },
  'admin-users': { resourceType: 'admin_users', label: 'Admin Users' },
  banners: { resourceType: 'banners', label: 'Banners' },
  catalogues: { resourceType: 'catalogues', label: 'Catalogues' },
  categories: { resourceType: 'categories', label: 'Categories' },
  'class-codes': { resourceType: 'class_codes', label: 'Class Codes' },
  crousals: { resourceType: 'crousals', label: 'Carousel Images' },
  displays: { resourceType: 'displays', label: 'Displays' },
  faqs: { resourceType: 'faqs', label: 'FAQs' },
  'filter-products': { resourceType: 'filter_products', label: 'Filter Products' },
  'group-products': { resourceType: 'group_products', label: 'Product Groups' },
  newsletters: { resourceType: 'newsletters', label: 'Newsletters' },
  'on-sale-products': { resourceType: 'on_sale_products', label: 'On Sale Products' },
  orders: { resourceType: 'orders', label: 'Orders' },
  patterns: { resourceType: 'patterns', label: 'Patterns' },
  'popup-ads': { resourceType: 'popup_ads', label: 'Popup Ads' },
  'pre-orders': { resourceType: 'pre_orders', label: 'Pre-Orders' },
  products: { resourceType: 'products', label: 'Products' },
  'product-group-items': { resourceType: 'product_group_items', label: 'Product Group Items' },
  roles: { resourceType: 'admin_roles', label: 'Roles' },
  'search-synonyms': { resourceType: 'search_synonyms', label: 'Search Synonyms' },
  'site-settings': { resourceType: 'site_settings', label: 'Site Settings' },
  'spanish-products': { resourceType: 'spanish_products', label: 'Spanish Products' },
  'web-users': { resourceType: 'web_users', label: 'Customers' },
};

export type ResolvedAuditResource = AuditResource & {
  // Present when the current path targets one record, e.g. /dashboard/web-users/42/edit.
  resourceId: string | null;
};

export function resolveAuditResource(pathname: string): ResolvedAuditResource | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'dashboard' || segments.length < 2) {
    return null;
  }

  const resource = AUDIT_RESOURCES[segments[1]];
  if (!resource) {
    return null;
  }

  const idSegment = segments[2];
  const resourceId = idSegment && /^\d+$/.test(idSegment) ? idSegment : null;

  return { ...resource, resourceId };
}
