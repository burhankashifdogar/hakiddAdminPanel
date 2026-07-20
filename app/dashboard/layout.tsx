'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import DashboardShell from '@/components/dashboard-shell';
import { adminGet } from '@/lib/api';
import {
  AdminSessionUser,
  canAccessAdminPath,
  clearAdminSession,
  getStoredAdminToken,
  storeAdminSession,
} from '@/lib/admin-auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getStoredAdminToken();
    if (!token) {
      clearAdminSession();
      router.replace('/login');
      return;
    }

    let cancelled = false;
    setReady(false);

    adminGet('/admin-api/me', token)
      .then((payload) => {
        if (cancelled) {
          return;
        }

        const user = ((payload as { user?: AdminSessionUser }).user ?? payload) as AdminSessionUser | null;

        if (!user) {
          throw new Error('Admin profile could not be loaded.');
        }

        storeAdminSession(token, user);

        if (!canAccessAdminPath(pathname, user)) {
          router.replace('/dashboard/forbidden');
          return;
        }

        setReady(true);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        clearAdminSession();
        router.replace('/login');
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return null;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
