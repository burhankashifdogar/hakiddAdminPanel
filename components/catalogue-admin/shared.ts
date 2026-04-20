'use client';

export type CatalogueLanguage = 'en' | 'fr';

export type CatalogueRow = {
  id: number;
  name: string;
  fre_name: string;
  display_name: string;
  file?: string | null;
  file_url?: string | null;
  image?: string | null;
  image_url?: string | null;
  enabled: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CatalogueListPayload = {
  data?: CatalogueRow[];
};

export type CatalogueFormState = {
  name: string;
  fre_name: string;
};

export const EMPTY_CATALOGUE_FORM: CatalogueFormState = {
  name: '',
  fre_name: '',
};

export const CATALOGUE_LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
] as const;

export function mapCatalogueToForm(catalogue: CatalogueRow): CatalogueFormState {
  return {
    name: catalogue.name ?? '',
    fre_name: catalogue.fre_name ?? '',
  };
}

export function getCatalogueDisplayName(row: CatalogueRow, language: CatalogueLanguage) {
  return language === 'fr' ? row.fre_name : row.name;
}

export function getFileNameFromPath(value?: string | null) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return '';
  }

  return normalized.split('/').pop() ?? normalized;
}
