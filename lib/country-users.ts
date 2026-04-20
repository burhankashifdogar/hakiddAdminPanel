export type CountryUsersRow = {
  country: string;
  country_code?: string | null;
  active_users: number | string;
};

const ISO_REGION_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AT', 'AU', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BN', 'BO', 'BR',
  'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CD', 'CF', 'CG', 'CH', 'CI', 'CL',
  'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
  'DO', 'DZ', 'EC', 'EE', 'EG', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FM', 'FR',
  'GA', 'GB', 'GD', 'GE', 'GH', 'GM', 'GN', 'GQ', 'GR', 'GT', 'GW', 'GY',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IN', 'IQ', 'IR', 'IS', 'IT',
  'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW',
  'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
  'MA', 'MC', 'MD', 'ME', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MR', 'MT',
  'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NE', 'NG', 'NI', 'NL', 'NO',
  'NP', 'NR', 'NZ', 'OM', 'PA', 'PE', 'PG', 'PH', 'PK', 'PL', 'PT', 'PW',
  'PY', 'QA', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG',
  'SI', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SY', 'SZ',
  'TD', 'TG', 'TH', 'TJ', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW',
  'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VN', 'VU', 'WS',
  'YE', 'ZA', 'ZM', 'ZW',
] as const;

const COUNTRY_TO_ISO2: Record<string, string> = {
  usa: 'US',
  us: 'US',
  uk: 'GB',
  uae: 'AE',
  czech: 'CZ',
  czechia: 'CZ',
  korea: 'KR',
  'south korea': 'KR',
  'north korea': 'KP',
  russia: 'RU',
  'russian federation': 'RU',
  turkey: 'TR',
  turkiye: 'TR',
  vietnam: 'VN',
  venezuela: 'VE',
  tanzania: 'TZ',
  moldova: 'MD',
  bolivia: 'BO',
  laos: 'LA',
  syria: 'SY',
  palestine: 'PS',
  taiwan: 'TW',
  'north macedonia': 'MK',
  'macedonia': 'MK',
  'brunei': 'BN',
  'iran': 'IR',
  'micronesia': 'FM',
  'cape verde': 'CV',
  'ivory coast': 'CI',
  'cote divoire': 'CI',
  'cote d ivoire': 'CI',
  'cote d’ivoire': 'CI',
  'the bahamas': 'BS',
  bahamas: 'BS',
  'the gambia': 'GM',
  gambia: 'GM',
  'myanmar (burma)': 'MM',
  myanmar: 'MM',
  burma: 'MM',
};

const DISPLAY_NAME_TO_ISO2: Record<string, string> = {};

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCountryKey(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
  const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
  for (const code of ISO_REGION_CODES) {
    const label = displayNames.of(code);
    if (!label) {
      continue;
    }

    const normalized = normalizeCountryKey(label);
    if (normalized && !DISPLAY_NAME_TO_ISO2[normalized]) {
      DISPLAY_NAME_TO_ISO2[normalized] = code;
    }
  }
}

export function toIso2(country?: string, countryCode?: string | null) {
  const explicit = String(countryCode ?? '').trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(explicit)) {
    return explicit;
  }

  const normalized = normalizeCountryKey(country);
  if (!normalized) {
    return undefined;
  }

  if (/^[a-z]{2}$/i.test(normalized)) {
    return normalized.toUpperCase();
  }

  return COUNTRY_TO_ISO2[normalized] ?? DISPLAY_NAME_TO_ISO2[normalized];
}

export function normalizeCountryUsers(payload: unknown): CountryUsersRow[] {
  if (Array.isArray(payload)) {
    return payload
      .map((row) => {
        if (!row || typeof row !== 'object') {
          return null;
        }

        const record = row as Record<string, unknown>;
        return {
          country: String(record.country ?? record.country_code ?? ''),
          country_code: record.country_code ? String(record.country_code) : null,
          active_users: toNumber(record.active_users),
        } satisfies CountryUsersRow;
      })
      .filter((row) => Boolean(row && row.country)) as CountryUsersRow[];
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  if ('error' in record || 'message' in record || 'statusCode' in record) {
    return [];
  }

  return Object.entries(record)
    .map(([countryOrCode, activeUsers]) => {
      const iso2 = toIso2(countryOrCode);
      return {
        country: countryOrCode,
        country_code: iso2 ?? null,
        active_users: toNumber(activeUsers),
      } satisfies CountryUsersRow;
    })
    .filter((row) => row.country && row.active_users >= 0);
}
