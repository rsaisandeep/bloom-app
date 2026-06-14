'use client';
import { usePathname } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

export default function NavWrapper() {
  const pathname = usePathname();
  if (pathname === '/login' || pathname === '/onboarding') return null;
  return <BottomNav />;
}
