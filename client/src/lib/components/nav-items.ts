import { Home, Boxes, Bike, Search, User } from '@lucide/svelte';

export const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home, keys: 'g h' },
  { href: '/parts', label: 'Parts', icon: Boxes, keys: 'g p' },
  { href: '/bikes', label: 'Bikes', icon: Bike, keys: 'g b' },
  { href: '/search', label: 'Search', icon: Search, keys: 'g s' },
  { href: '/profile', label: 'Profile', icon: User, keys: 'g u' }
];

/** Active when the path equals the href or is nested under it (except root). */
export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}
