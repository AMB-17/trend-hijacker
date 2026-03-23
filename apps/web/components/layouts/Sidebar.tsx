'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

const sidebarLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/trends', label: 'Trends', icon: '📈' },
  { href: '/early-signals', label: 'Early Signals', icon: '⚡' },
  { href: '/opportunities', label: 'Opportunities', icon: '🎯' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:fixed lg:left-0 lg:top-16 lg:bottom-0 lg:w-64 lg:border-r lg:border-border lg:bg-card/50 lg:overflow-y-auto">
      <nav className="p-4 space-y-2">
        {sidebarLinks.map(({ href, label, icon }) => {
          const isActive = pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary/20 text-primary font-semibold'
                  : 'text-muted hover:text-foreground hover:bg-card'
              )}
            >
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
