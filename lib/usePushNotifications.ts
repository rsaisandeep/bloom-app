'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

type PushStatus = 'unsupported' | 'denied' | 'prompt' | 'subscribed' | 'loading';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    const perm = Notification.permission;
    if (perm === 'denied') { setStatus('denied'); return; }

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) { setSubscription(sub); setStatus('subscribed'); }
        else setStatus(perm === 'granted' ? 'prompt' : 'prompt');
      });
    });
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) { console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set'); return false; }

    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const token = await getToken();
      if (!token) { sub.unsubscribe(); setStatus('prompt'); return false; }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(sub.toJSON()),
      });

      if (!res.ok) { sub.unsubscribe(); setStatus('prompt'); return false; }

      setSubscription(sub);
      setStatus('subscribed');
      return true;
    } catch {
      // User denied or SW error
      setStatus(Notification.permission === 'denied' ? 'denied' : 'prompt');
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false;
    setStatus('loading');
    try {
      const token = await getToken();
      if (token) {
        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }
      await subscription.unsubscribe();
      setSubscription(null);
      setStatus('prompt');
      return true;
    } catch {
      setStatus('subscribed');
      return false;
    }
  }, [subscription]);

  return { status, subscribe, unsubscribe };
}
