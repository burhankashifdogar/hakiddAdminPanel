const DEFAULT_ADMIN_ASSET_CDN_URL = 'https://d21x5cn74vewx6.cloudfront.net';

function normalizeBaseUrl(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return DEFAULT_ADMIN_ASSET_CDN_URL;
  }

  const sanitized = raw.replace(/^['"]+|['"]+$/g, '').replace(/\/+$/g, '');

  try {
    return new URL(sanitized).toString().replace(/\/+$/g, '');
  } catch {
    return DEFAULT_ADMIN_ASSET_CDN_URL;
  }
}

function normalizeCdnPath(path: string) {
  const sanitized = path.trim().replace(/^\/+/, '');

  if (sanitized.toLowerCase().startsWith('hakidd/')) {
    return sanitized.slice('hakidd/'.length);
  }

  return sanitized;
}

function buildCdnUrl(path: string, search = '', hash = '') {
  const base = normalizeBaseUrl(process.env.NEXT_PUBLIC_ASSET_CDN_URL);
  const normalizedPath = normalizeCdnPath(path);
  return normalizedPath ? `${base}/${normalizedPath}${search}${hash}` : `${base}${search}${hash}`;
}

function isBlobLikeUrl(value: string) {
  return /^blob:/i.test(value) || /^data:/i.test(value);
}

export function getAdminImageUrl(value?: string | null) {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return null;
  }

  if (isBlobLikeUrl(raw)) {
    return raw;
  }

  if (raw.startsWith('/')) {
    return buildCdnUrl(raw);
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const hostname = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname;

      if (hostname.includes('cloudfront.net')) {
        return buildCdnUrl(pathname, parsed.search, parsed.hash);
      }

      if (hostname.includes('amazonaws.com')) {
        return buildCdnUrl(pathname, parsed.search, parsed.hash);
      }

      return raw;
    } catch {
      return raw;
    }
  }

  return buildCdnUrl(raw);
}

export function getRequiredAdminImageUrl(path: string) {
  const raw = String(path ?? '').trim();

  if (raw.startsWith('/assets/')) {
    return raw;
  }

  return getAdminImageUrl(raw) ?? raw;
}
