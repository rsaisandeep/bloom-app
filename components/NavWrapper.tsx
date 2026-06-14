'use client';
import { usePathname } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

const HIDDEN = ['/login', '/onboarding'];

export default function NavWrapper() {
  const pathname = usePathname();
  if (HIDDEN.includes(pathname)) return null;
  return <BottomNav />;
}
