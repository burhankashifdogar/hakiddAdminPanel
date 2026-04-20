import { CrudField } from './simple-crud-page';

export type AdditionalProductFormValues = Record<string, string>;

const ADDITIONAL_PRODUCT_FLASH_KEY = 'hakidd_admin_additional_products_flash';

export const additionalProductFields: CrudField[] = [
  { name: 'product_id', label: 'Product ID', required: true },
  { name: 'type', label: 'Type', required: true },
  { name: 'en_title', label: 'English Title', required: true },
  { name: 'fr_title', label: 'French Title', required: true },
  { name: 'sp_title', label: 'Spanish Title', required: true },
  { name: 'image_1', label: 'Image 1 Path' },
  { name: 'image_2', label: 'Image 2 Path' },
  { name: 'pdf', label: 'PDF Path' },
  { name: 'en_headline', label: 'English Headline' },
  { name: 'fr_headline', label: 'French Headline' },
  { name: 'sp_headline', label: 'Spanish Headline' },
  { name: 'en_para', label: 'English Paragraph', type: 'textarea' },
  { name: 'fr_para', label: 'French Paragraph', type: 'textarea' },
  { name: 'sp_para', label: 'Spanish Paragraph', type: 'textarea' },
  { name: 'video', label: 'Video' },
  { name: 'url', label: 'URL' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Active', value: '1' },
      { label: 'Inactive', value: '0' },
    ],
  },
];

export function emptyAdditionalProductForm(): AdditionalProductFormValues {
  return Object.fromEntries(additionalProductFields.map((field) => [field.name, field.name === 'status' ? '1' : '']));
}

export function toAdditionalProductFormValues(value?: Record<string, unknown> | null): AdditionalProductFormValues {
  const base = emptyAdditionalProductForm();

  for (const field of additionalProductFields) {
    base[field.name] = String(value?.[field.name] ?? base[field.name] ?? '');
  }

  return base;
}

export function toAdditionalProductPayload(values: AdditionalProductFormValues) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
}

export function setAdditionalProductFlash(message: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(ADDITIONAL_PRODUCT_FLASH_KEY, message);
}

export function consumeAdditionalProductFlash() {
  if (typeof window === 'undefined') {
    return null;
  }

  const message = window.sessionStorage.getItem(ADDITIONAL_PRODUCT_FLASH_KEY);
  if (!message) {
    return null;
  }

  window.sessionStorage.removeItem(ADDITIONAL_PRODUCT_FLASH_KEY);
  return message;
}
