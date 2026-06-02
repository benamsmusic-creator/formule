export const ADMIN_PREFIXES = [
  '/dashboard', '/builder', '/clients', '/parametres', '/newsletter', '/yahrzeit',
  '/annuaire', '/annonces', '/anniversaires', '/historique', '/membres', '/encheres', '/sms', '/plan',
];

export function isAdminPath(pathname: string): boolean {
  return ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p));
}

export const NAV_PRIMARY = [
  { href: '/dashboard', icon: '◈', label: 'Tableau de bord', exact: true },
  { href: '/builder', icon: '➕', label: 'Créer un formulaire' },
];

export const NAV_GROUPS = [
  { group: 'Communauté', items: [
    { href: '/dashboard/crm', icon: '📇', label: 'CRM' },
    { href: '/membres', icon: '🪪', label: 'Adhésions' },
    { href: '/annuaire', icon: '📒', label: 'Annuaire' },
  ] },
  { group: 'Communication', items: [
    { href: '/annonces', icon: '📢', label: 'Annonces' },
    { href: '/newsletter', icon: '📣', label: 'Newsletter' },
    { href: '/sms', icon: '📱', label: 'SMS' },
  ] },
  { group: 'Cycle de vie', items: [
    { href: '/yahrzeit', icon: '🕯️', label: 'Yahrzeit' },
    { href: '/anniversaires', icon: '🎂', label: 'Anniversaires' },
  ] },
  { group: 'Événements & dons', items: [
    { href: '/dashboard/gala', icon: '🥂', label: 'Gala' },
    { href: '/encheres', icon: '🔨', label: 'Enchères' },
  ] },
  { group: 'Gestion', items: [
    { href: '/parametres', icon: '⚙️', label: 'Réglages' },
    { href: '/historique', icon: '🕘', label: 'Historique' },
  ] },
];
