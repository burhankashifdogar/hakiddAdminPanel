export type GroupProductFormValues = {
  title: string;
  description: string;
  external: string;
};

const GROUP_PRODUCT_FLASH_KEY = 'hakidd_admin_group_products_flash';

export function emptyGroupProductForm(): GroupProductFormValues {
  return {
    title: '',
    description: '',
    external: '',
  };
}

export function toGroupProductFormValues(value?: Partial<Record<keyof GroupProductFormValues, unknown>> | null): GroupProductFormValues {
  return {
    title: String(value?.title ?? ''),
    description: String(value?.description ?? ''),
    external: String(value?.external ?? ''),
  };
}

export function toGroupProductPayload(values: GroupProductFormValues, includeExternal: boolean) {
  return includeExternal
    ? {
        title: values.title.trim(),
        description: values.description.trim(),
        external: values.external.trim(),
      }
    : {
        title: values.title.trim(),
        description: values.description.trim(),
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
