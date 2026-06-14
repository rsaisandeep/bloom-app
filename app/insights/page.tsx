'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Insights folded into the Reports tab.
export default function InsightsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/reports'); }, [router]);
  return null;
}
