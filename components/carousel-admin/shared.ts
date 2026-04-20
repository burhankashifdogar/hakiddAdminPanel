'use client';

export type CrousalRow = {
  id: number;
  header: string;
  fre_header: string;
  sp_header: string;
  text: string;
  fre_text: string;
  sp_text: string;
  link: string;
  img?: string | null;
  img_url?: string | null;
  mbl_img?: string | null;
  mbl_img_url?: string | null;
  tab_img?: string | null;
  tab_img_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CrousalListPayload = {
  data?: CrousalRow[];
};

export type CrousalFormState = {
  header: string;
  fre_header: string;
  sp_header: string;
  text: string;
  fre_text: string;
  sp_text: string;
  link: string;
};

export const EMPTY_CROUSAL_FORM: CrousalFormState = {
  header: '',
  fre_header: '',
  sp_header: '',
  text: '',
  fre_text: '',
  sp_text: '',
  link: '',
};

export function mapCrousalToForm(crousal: CrousalRow): CrousalFormState {
  return {
    header: crousal.header ?? '',
    fre_header: crousal.fre_header ?? '',
    sp_header: crousal.sp_header ?? '',
    text: crousal.text ?? '',
    fre_text: crousal.fre_text ?? '',
    sp_text: crousal.sp_text ?? '',
    link: crousal.link ?? '',
  };
}
