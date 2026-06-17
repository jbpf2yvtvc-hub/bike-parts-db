import { Home, Boxes, Bike, Search, User } from '@lucide/svelte';

export const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/parts', label: 'Parts', icon: Boxes },
  { href: '/bikes', label: 'Bikes', icon: Bike },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/profile', label: 'Profile', icon: User }
];

/** Active when the path equals the href or is nested under it (except root). */
export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}
