'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const hasSession = !!data.session;
      if (!hasSession && pathname !== '/login') {
        router.replace('/login');
      } else if (hasSession && pathname === '/login') {
        router.replace('/');
      } else {
        setReady(true);
      }
    });
  }, [pathname, router]);

  if (!ready) return null;
  return <>{children}</>;
}
