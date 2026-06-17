'use client';
import { useEffect, useState } from 'react';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Capture beforeinstallprompt at module load (a singleton) — it fires once,
// early, so any component that mounts later (e.g. the hamburger) can still
// reach it instead of registering its own listener and missing the event.
let deferred: BIPEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    window.dispatchEvent(new Event('bloom:installable'));
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    window.dispatchEvent(new Event('bloom:installed'));
  });
}

function checkStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error iOS-only Safari flag
    window.navigator.standalone === true;
}

export function useInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setStandalone(checkStandalone());
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setCanInstall(!!deferred);
    const onAvail = () => setCanInstall(!!deferred);
    const onInstalled = () => { setCanInstall(false); setStandalone(true); };
    window.addEventListener('bloom:installable', onAvail);
    window.addEventListener('bloom:installed', onInstalled);
    return () => {
      window.removeEventListener('bloom:installable', onAvail);
      window.removeEventListener('bloom:installed', onInstalled);
    };
  }, []);

  // Android/Chromium native install. Returns false on iOS (no API).
  async function promptInstall(): Promise<boolean> {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    deferred = null;
    setCanInstall(false);
    return choice.outcome === 'accepted';
  }

  // Whether to offer install at all (not already installed, and either Android
  // can prompt or it's iOS where the user adds it manually).
  const installable = !standalone && (canInstall || isIos);

  return { canInstall, standalone, isIos, installable, promptInstall };
}
