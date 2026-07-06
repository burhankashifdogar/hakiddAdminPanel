export type GroupProductFormValues = {
  title: string;
  description: string;
  title_en: string;
  description_en: string;
  title_es: string;
  description_es: string;
  external: string;
};

const GROUP_PRODUCT_FLASH_KEY = 'hakidd_admin_group_products_flash';

export function emptyGroupProductForm(): GroupProductFormValues {
  return {
    title: '',
    description: '',
    title_en: '',
    description_en: '',
    title_es: '',
    description_es: '',
    external: '',
  };
}

export function toGroupProductFormValues(value?: Partial<Record<keyof GroupProductFormValues, unknown>> | null): GroupProductFormValues {
  return {
    title: String(value?.title ?? ''),
    description: String(value?.description ?? ''),
    title_en: String(value?.title_en ?? value?.title ?? ''),
    description_en: String(value?.description_en ?? value?.description ?? ''),
    title_es: String(value?.title_es ?? ''),
    description_es: String(value?.description_es ?? ''),
    external: String(value?.external ?? ''),
  };
}

export function toGroupProductPayload(values: GroupProductFormValues, includeExternal: boolean) {
  const title = values.title.trim();
  const description = values.description.trim();
  const titleEn = values.title_en.trim() || title;
  const descriptionEn = values.description_en.trim() || description;

  return includeExternal
    ? {
        title,
        description,
        title_en: titleEn,
        description_en: descriptionEn,
        title_es: values.title_es.trim(),
        description_es: values.description_es.trim(),
        external: values.external.trim(),
      }
    : {
        title,
        description,
        title_en: titleEn,
        description_en: descriptionEn,
        title_es: values.title_es.trim(),
        description_es: values.description_es.trim(),
      };
}

export function setGroupProductFlash(message: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(GROUP_PRODUCT_FLASH_KEY, message);
}

export function consumeGroupProductFlash() {
  if (typeof window === 'undefined') {
    return null;
  }

  const message = window.sessionStorage.getItem(GROUP_PRODUCT_FLASH_KEY);
  if (!message) {
    return null;
  }

  window.sessionStorage.removeItem(GROUP_PRODUCT_FLASH_KEY);
  return message;
}
