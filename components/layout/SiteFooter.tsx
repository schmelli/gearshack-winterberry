import Link from 'next/link';
import Image from 'next/image';
import { FOOTER_LEGAL_LINKS, FOOTER_SOCIAL_LINKS } from '@/lib/constants/navigation';
import { cn } from '@/lib/utils';

interface SiteFooterProps {
  className?: string;
}

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer className={cn('bg-slate-900 text-slate-200', className)}>
      <div className="container grid gap-8 py-12 md:grid-cols-3">
        {/* Brand column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logos/big_gearshack_logo.png"
              alt="Gearshack Logo"
              width={64}
              height={64}
              className="h-16 w-16"
            />
          </div>
          <p className="text-sm text-slate-400">
            Gear management for the obsessed.
          </p>
        </div>

        {/* Legal links column */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Legal
          </h3>
          <nav className="flex flex-col gap-2">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-slate-300 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Social links column */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Connect
          </h3>
          <div className="flex gap-4">
            {FOOTER_SOCIAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 transition-colors hover:text-white"
                aria-label={link.label}
              >
                <link.icon className="h-5 w-5" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-slate-800 py-4 text-center text-sm text-slate-400">
        &copy; 2025 Gearshack. Built with Vibe.
      </div>
    </footer>
  );
}
