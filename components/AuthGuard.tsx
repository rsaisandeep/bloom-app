'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    function route(hasSession: boolean) {
      if (!active) return;
      // Only GATE protected routes. Never force a user off /login — the login
      // page navigates home itself after a successful sign-in. Auto-redirecting
      // /login -> / on any detected session is what bounced logout back home.
      if (!hasSession && pathname !== '/login') {
        router.replace('/login');
      } else {
        setReady(true);
      }
    }

    supabase.auth.getSession().then(({ data }) => route(!!data.session));

    // React to logout/login in real time so a stale read can't strand the user.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      route(!!session);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (!ready) return null;
  return <>{children}</>;
}
