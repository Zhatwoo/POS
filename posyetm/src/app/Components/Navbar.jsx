'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'POS / Sales', href: '/sales' },
  {
    label: 'Inventory',
    href: '/inventory',
  },
  {
    label: 'Receipts & Transactions',
    href: '/transactions',
  },
  {
    label: 'Reports ',
    href: '/reports',
  },
  { label: 'Users', href: '/users' },
  { label: 'Settings', href: '/settings' },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const isActive = (href) => {
    if (href === '/dashboard') {
      return pathname?.startsWith('/Dashboard') || pathname === '/dashboard';
    }
    if (href === '/sales') {
      return pathname === '/sales' || pathname === '/pos';
    }
    return pathname === href;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/20 bg-gradient-to-r from-[#6366F1] via-[#5B6FF8] to-[#3B82F6] text-white shadow-lg shadow-indigo-500/20">
      <div className="relative flex items-center justify-between py-3">
        <div className="flex items-center space-x-2 pl-4 md:pl-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 font-bold text-lg">
            PO
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/70">POSystem</p>
            <p className="text-lg font-semibold leading-tight">Control Center</p>
          </div>
        </div>

        <nav className="absolute left-1/2 transform -translate-x-1/2 hidden gap-1 lg:flex">
          {NAV_LINKS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-center px-6 py-3 text-sm font-medium transition w-40 ${
                  active
                    ? 'bg-white text-indigo-600 font-semibold'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center pr-4 md:pr-8">
          <button
            type="button"
            onClick={toggleMenu}
            className="inline-flex items-center justify-center border border-white/30 bg-white/10 px-6 py-3 text-white transition hover:bg-white/20 lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <span className="text-sm font-semibold">{isMenuOpen ? 'Close' : 'Menu'}</span>
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="border-t border-white/10 bg-[#1E1B4B]/90 px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-center px-6 py-5 text-sm font-semibold text-white transition w-full ${
                    active
                      ? 'bg-white text-indigo-600'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

