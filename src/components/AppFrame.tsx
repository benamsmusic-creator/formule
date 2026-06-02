'use client';
import { usePathname } from 'next/navigation';
import { isAdminPath } from '@/lib/adminRoutes';

/** Décale le contenu des pages admin pour laisser place à la sidebar (desktop). */
export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const admin = isAdminPath(pathname);
  return <main className={admin ? 'lg:pl-60' : ''}>{children}</main>;
}
