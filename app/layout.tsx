import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import { getRequiredAdminImageUrl } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Hakidd Admin',
  description: 'Hakidd admin panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=0, minimal-ui" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="author" content="H. A. Kidd and Company Limited" />
        <link rel="icon" href={getRequiredAdminImageUrl('/assets/images/hakidd-mark.png')} type="image/png" />
        <link rel="stylesheet" href="/assets/css/plugins/flatpickr.min.css" />
        <link rel="stylesheet" href="/assets/css/plugins/jsvectormap.min.css" />
        <link
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/assets/fonts/tabler-icons.min.css" />
        <link rel="stylesheet" href="/assets/fonts/feather.css" />
        <link rel="stylesheet" href="/assets/fonts/fontawesome.css" />
        <link rel="stylesheet" href="/assets/fonts/material.css" />
        <link rel="stylesheet" href="/assets/css/style.css" id="main-style-link" />
        <link rel="stylesheet" href="/assets/css/style-preset.css" />
      </head>
      <body
        data-pc-preset="preset-1"
        data-pc-sidebar-caption="true"
        data-pc-direction="ltr"
        data-pc-theme="light"
      >
        {children}
        <Script src="/assets/js/plugins/popper.min.js" strategy="afterInteractive" />
        <Script src="/assets/js/plugins/simplebar.min.js" strategy="afterInteractive" />
        <Script src="/assets/js/plugins/bootstrap.min.js" strategy="afterInteractive" />
        <Script src="/assets/js/plugins/flatpickr.min.js" strategy="afterInteractive" />
        <Script src="/assets/js/fonts/custom-font.js" strategy="afterInteractive" />
        <Script src="/assets/js/pcoded.js" strategy="afterInteractive" />
        <Script src="/assets/js/plugins/feather.min.js" strategy="afterInteractive" />
        {/* jsvectormap + world map data are only used on the dashboard; they are
            loaded there (see app/dashboard/page.tsx) instead of on every page. */}
        <Script id="hakidd-theme-init" strategy="afterInteractive">
          {`
            if (typeof window !== 'undefined') {
              window.layout_change && window.layout_change('light');
              window.layout_sidebar_change && window.layout_sidebar_change('light');
              window.change_box_container && window.change_box_container('false');
              window.layout_caption_change && window.layout_caption_change('true');
              window.layout_rtl_change && window.layout_rtl_change('false');
              window.preset_change && window.preset_change('preset-1');
            }
          `}
        </Script>
      </body>
    </html>
  );
}
