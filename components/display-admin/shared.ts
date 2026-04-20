'use client';

export type DisplayRow = {
  id: number;
  link: string;
  heading: string;
  fre_heading: string;
  sp_heading: string;
  text: string;
  fre_text: string;
  sp_text: string;
  button_text?: string | null;
  fr_button_text?: string | null;
  sp_button_text?: string | null;
  image?: string | null;
  image_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DisplayListPayload = {
  data?: DisplayRow[];
};

export type DisplayFormState = {
  link: string;
  heading: string;
  fre_heading: string;
  sp_heading: string;
  text: string;
  fre_text: string;
  sp_text: string;
  button_text: string;
  fr_button_text: string;
  sp_button_text: string;
};

export const EMPTY_DISPLAY_FORM: DisplayFormState = {
  link: '',
  heading: '',
  fre_heading: '',
  sp_heading: '',
  text: '',
  fre_text: '',
  sp_text: '',
  button_text: '',
  fr_button_text: '',
  sp_button_text: '',
};

export function mapDisplayToForm(display: DisplayRow): DisplayFormState {
  return {
    link: display.link ?? '',
    heading: display.heading ?? '',
    fre_heading: display.fre_heading ?? '',
    sp_heading: display.sp_heading ?? '',
    text: display.text ?? '',
    fre_text: display.fre_text ?? '',
    sp_text: display.sp_text ?? '',
    button_text: display.button_text ?? '',
    fr_button_text: display.fr_button_text ?? '',
    sp_button_text: display.sp_button_text ?? '',
  };
}
