'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full bg-card/80 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-white font-bold">
              T
            </div>
            <span className="hidden sm:inline text-foreground">Trend Hijacker</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/trends">Trends</NavLink>
            <NavLink href="/opportunities">Opportunities</NavLink>
          </nav>

          {/* Right side - eventual user menu */}
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">U</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={clsx(
        'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'text-primary bg-primary/10'
          : 'text-muted hover:text-foreground hover:bg-card/50'
      )}
    >
      {children}
    </Link>
  );
}
