'use client';

export type NewsletterRow = {
  id: number;
  header: string;
  fre_header: string;
  sp_header?: string | null;
  img?: string | null;
  img_url?: string | null;
  link: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type NewsletterListPayload = {
  data?: NewsletterRow[];
  total?: number;
  per_page?: number;
  current_page?: number;
  last_page?: number;
  filters?: {
    search?: string;
  };
};

export type NewsletterFormState = {
  header: string;
  fre_header: string;
  sp_header: string;
  link: string;
};

export const EMPTY_NEWSLETTER_FORM: NewsletterFormState = {
  header: '',
  fre_header: '',
  sp_header: '',
  link: '',
};

export const NEWSLETTER_IMAGE_ASPECT_RATIO = '16 / 9';
export const NEWSLETTER_THUMBNAIL_WIDTH = 160;

export function mapNewsletterToForm(newsletter: NewsletterRow): NewsletterFormState {
  return {
    header: newsletter.header ?? '',
    fre_header: newsletter.fre_header ?? '',
    sp_header: newsletter.sp_header ?? '',
    link: newsletter.link ?? '',
  };
}
