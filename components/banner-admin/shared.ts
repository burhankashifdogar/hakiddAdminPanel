'use client';

export type BannerType = 'info' | 'warning' | 'success' | 'promo' | 'danger';

export type BannerMessages = Record<string, string>;

export type BannerRow = {
  id: number;
  title?: string | null;
  messages?: BannerMessages;
  message_preview?: string;
  available_languages?: string[];
  type: BannerType;
  show: boolean;
  country?: string | null;
  priority: number;
  background_color: string;
  text_color: string;
  meta?: Record<string, unknown> | unknown[] | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BannerListPayload = {
  data?: BannerRow[];
  total?: number;
  per_page?: number;
  current_page?: number;
  last_page?: number;
};

export type BannerFormState = {
  title: string;
  type: BannerType;
  country: string;
  priority: string;
  show: boolean;
  start_date: string;
  end_date: string;
  background_color: string;
  text_color: string;
  meta: string;
  message_en: string;
  message_fr: string;
  message_es: string;
};

export const BANNER_SUPPORTED_LANGUAGES = ['en', 'fr', 'es'] as const;

export const BANNER_TYPE_OPTIONS = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'success', label: 'Success' },
  { value: 'promo', label: 'Promo' },
  { value: 'danger', label: 'Danger' },
] as const;

export const EMPTY_BANNER_FORM: BannerFormState = {
  title: '',
  type: 'info',
  country: '',
  priority: '1',
  show: false,
  start_date: '',
  end_date: '',
  background_color: '#007bff',
  text_color: '#ffffff',
  meta: '',
  message_en: '',
  message_fr: '',
  message_es: '',
};

function formatDateTimeForInput(value?: string | null) {
  if (!value) {
    return '';
  }

  const sanitized = value.trim().replace(' ', 'T');
  const parsed = new Date(sanitized);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  const hours = `${parsed.getHours()}`.padStart(2, '0');
  const minutes = `${parsed.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatMeta(value: BannerRow['meta']) {
  if (value === null || value === undefined) {
    return '';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
}

export function mapBannerToForm(banner: BannerRow): BannerFormState {
  const messages = banner.messages ?? {};

  return {
    title: banner.title ?? '',
    type: banner.type ?? 'info',
    country: banner.country ?? '',
    priority: String(banner.priority ?? 1),
    show: Boolean(banner.show),
    start_date: formatDateTimeForInput(banner.start_date),
    end_date: formatDateTimeForInput(banner.end_date),
    background_color: banner.background_color ?? '#007bff',
    text_color: banner.text_color ?? '#ffffff',
    meta: formatMeta(banner.meta),
    message_en: messages.en ?? '',
    message_fr: messages.fr ?? '',
    message_es: messages.es ?? '',
  };
}

export function truncateBannerText(value: string, length = 50) {
  const normalized = value.trim();
  if (normalized.length <= length) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, length - 3))}...`;
}
