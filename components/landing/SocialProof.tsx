/**
 * SocialProof Component
 *
 * Feature: 028-landing-page-i18n
 * T013: Social proof section with trust indicators
 * FR-003: Display a social proof section with trust indicators
 *
 * This is a stateless presentational component - receives translation function via props.
 */

import { Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SocialProofProps {
  /** Translation function from parent (Landing namespace) */
  t: (key: string) => string;
}

const TESTIMONIALS = [
  { quoteKey: 'socialProof.testimonial1.quote', authorKey: 'socialProof.testimonial1.author' },
  { quoteKey: 'socialProof.testimonial2.quote', authorKey: 'socialProof.testimonial2.author' },
  { quoteKey: 'socialProof.testimonial3.quote', authorKey: 'socialProof.testimonial3.author' },
] as const;

export function SocialProof({ t }: SocialProofProps) {
  return (
    <section className="bg-zinc-900 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center text-3xl font-bold text-white md:text-4xl">
          {t('socialProof.title')}
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <Card
              key={testimonial.quoteKey}
              className="border-zinc-800 bg-zinc-950/50"
            >
              <CardContent className="pt-6">
                <Quote className="mb-4 h-8 w-8 text-emerald-500/50" />
                <blockquote className="mb-4 text-lg italic text-zinc-300">
                  &ldquo;{t(testimonial.quoteKey)}&rdquo;
                </blockquote>
                <p className="text-sm font-medium text-emerald-400">
                  {t(testimonial.authorKey)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
