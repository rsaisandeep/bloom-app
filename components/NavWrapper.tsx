'use client';
import { usePathname } from 'next/navigation';
import TopTabs from '@/components/BottomNav';

export default function NavWrapper() {
  const pathname = usePathname();
  if (pathname === '/login') return null;
  return <TopTabs />;
}
