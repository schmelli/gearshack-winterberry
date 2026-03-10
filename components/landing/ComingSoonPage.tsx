/**
 * ComingSoonPage Component
 *
 * Pre-announcement landing page with newsletter signup.
 * Stateless except for newsletter form state.
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Mountain, Compass, Backpack, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

export function ComingSoonPage() {
  const t = useTranslations('ComingSoon');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === 'loading') return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });

      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        const data = await res.json();
        setErrorMsg(data.error || t('form.errorGeneric'));
        setStatus('error');
      }
    } catch {
      setErrorMsg(t('form.errorGeneric'));
      setStatus('error');
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <Image
        src="/images/headers/headerimage2.jpeg"
        alt="Mountain landscape"
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16">
        {/* Logo — hidden link to login for team access */}
        <Link href="/login" className="mb-8 block">
          <Image
            src="/logos/big_gearshack_logo.png"
            alt="Gearshack"
            width={240}
            height={80}
            className="drop-shadow-lg"
            priority
          />
        </Link>

        {/* Headline */}
        <h1 className="mb-4 max-w-3xl text-center font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          {t('headline')}
        </h1>

        {/* Subtitle */}
        <p className="mb-12 max-w-2xl text-center text-lg text-white/80 sm:text-xl">
          {t('subtitle')}
        </p>

        {/* Feature Pillars */}
        <div className="mb-14 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          <FeaturePill
            icon={<Backpack className="h-6 w-6" />}
            title={t('features.inventory.title')}
            description={t('features.inventory.description')}
          />
          <FeaturePill
            icon={<Compass className="h-6 w-6" />}
            title={t('features.loadouts.title')}
            description={t('features.loadouts.description')}
          />
          <FeaturePill
            icon={<Mountain className="h-6 w-6" />}
            title={t('features.community.title')}
            description={t('features.community.description')}
          />
        </div>

        {/* Newsletter Signup */}
        <div className="w-full max-w-md">
          {status === 'success' ? (
            <div className="flex items-center justify-center gap-3 rounded-xl bg-emerald-900/60 px-6 py-4 text-emerald-200 backdrop-blur-sm">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{t('form.success')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <p className="text-center text-sm font-medium text-white/70">
                {t('form.label')}
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <Input
                    type="email"
                    placeholder={t('form.placeholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={status === 'loading'}
                    className="border-white/20 bg-white/10 pl-10 text-white placeholder:text-white/40 focus:border-emerald-400 focus:ring-emerald-400/20"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={status === 'loading' || !email}
                  className="bg-emerald-600 px-6 hover:bg-emerald-500"
                >
                  {status === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t('form.button')
                  )}
                </Button>
              </div>
              {status === 'error' && (
                <p className="text-center text-sm text-red-400">{errorMsg}</p>
              )}
              <p className="text-center text-xs text-white/40">
                {t('form.privacy')}
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-white/30">
          <p>&copy; {new Date().getFullYear()} Gearshack. {t('footer')}</p>
        </div>
      </div>
    </div>
  );
}

function FeaturePill({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-white/5 px-5 py-6 text-center backdrop-blur-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600/30 text-emerald-400">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="text-xs leading-relaxed text-white/60">{description}</p>
    </div>
  );
}
