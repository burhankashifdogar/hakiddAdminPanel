'use client';

export type CategoryLanguage = 'eng' | 'fre' | 'sp';

export type CategoryRow = {
  id: number;
  name: string;
  sub_cat: string | null;
  sub_sub: string | null;
  cat_code: string;
  lang: CategoryLanguage;
};

export type CategoriesViewPayload = {
  categories: Record<CategoryLanguage, CategoryRow[]>;
};

export type CategoryListPayload = {
  categories: CategoryRow[];
};

export type CategoryCreateOptionsPayload = {
  category_groups: Array<{
    name: string;
    sub_categories: string[];
  }>;
};

export const CATEGORY_LANGUAGES: CategoryLanguage[] = ['eng', 'fre', 'sp'];

export function formatCategoryLanguage(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'eng' || normalized === 'en') {
    return 'English';
  }

  if (normalized === 'fre' || normalized === 'fr') {
    return 'French';
  }

  if (normalized === 'sp' || normalized === 'es') {
    return 'Spanish';
  }

  return value;
}

export function decodeCategorySegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function encodeCategorySegment(value: string) {
  return encodeURIComponent(value);
}
