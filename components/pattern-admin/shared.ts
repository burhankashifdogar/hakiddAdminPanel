'use client';

export type PatternRow = {
  id: number;
  name: string;
  fre_name: string;
  sp_name: string;
  display_name: string;
  file?: string | null;
  file_url?: string | null;
  image?: string | null;
  image_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PatternListPayload = {
  data?: PatternRow[];
  total?: number;
  per_page?: number;
  current_page?: number;
  last_page?: number;
  filters?: {
    search?: string;
  };
};

export type PatternFormState = {
  name: string;
  fre_name: string;
  sp_name: string;
};

export const EMPTY_PATTERN_FORM: PatternFormState = {
  name: '',
  fre_name: '',
  sp_name: '',
};

export function mapPatternToForm(pattern: PatternRow): PatternFormState {
  return {
    name: pattern.name ?? '',
    fre_name: pattern.fre_name ?? '',
    sp_name: pattern.sp_name ?? '',
  };
}

export function getFileNameFromPath(value?: string | null) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return '';
  }

  return normalized.split('/').pop() ?? normalized;
}
