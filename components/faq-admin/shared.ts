'use client';

export type FaqLanguage = 'en' | 'fr' | 'es';

export type FaqRow = {
  id: number;
  question: string;
  answer: string;
  lang: FaqLanguage;
  created_at?: string | null;
  updated_at?: string | null;
};

export type FaqListPayload = {
  data?: FaqRow[];
};

export type FaqFormState = {
  question: string;
  answer: string;
  lang: FaqLanguage;
};

export const EMPTY_FAQ_FORM: FaqFormState = {
  question: '',
  answer: '',
  lang: 'en',
};

export const FAQ_LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
] as const;

export function mapFaqToForm(faq: FaqRow): FaqFormState {
  return {
    question: faq.question ?? '',
    answer: faq.answer ?? '',
    lang: faq.lang ?? 'en',
  };
}

export function getFaqLanguageLabel(language: string) {
  if (language === 'fr') {
    return 'French';
  }

  if (language === 'es') {
    return 'Spanish';
  }

  return 'English';
}

export function truncateFaqAnswer(value: string, limit = 80) {
  const normalized = value.trim();
  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, limit - 3))}...`;
}
