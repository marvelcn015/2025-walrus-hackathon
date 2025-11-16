'use client';

import Link from 'next/link';
import { WalletButton } from '@/src/frontend/components/wallet/WalletButton';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              M&A
            </div>
            <span className="hidden font-bold sm:inline-block">
              Earn-out Platform
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link
              href="/deals"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              My Deals
            </Link>
            <Link
              href="/api-docs"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              API Docs
            </Link>
          </nav>
        </div>

        {/* Wallet Button */}
        <WalletButton />
      </div>
    </header>
  );
}
