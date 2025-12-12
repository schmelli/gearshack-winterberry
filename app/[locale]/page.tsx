/**
 * Home Page (Landing Page)
 *
 * Feature: 028-landing-page-i18n
 * T016: Render LandingPage component
 * FR-006: Shows "Start Free Trial" for guests (via LandingPage)
 * FR-005: Shows "Go to Dashboard" for authenticated users (via LandingPage)
 */

import { LandingPage } from '@/components/landing/LandingPage';

export default function Home() {
  return <LandingPage />;
}
