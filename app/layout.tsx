import type { Metadata } from 'next';
import { BlindspotProvider } from '@tindalabs/blindspot-next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tindalabs — Browser security & identity for hostile environments',
  description:
    'Three composable open-source SDKs: Blindspot (OTel browser observability), Shield (tamper detection), and Scent (probabilistic identity continuity). Works together or independently.',
  openGraph: {
    title: 'Tindalabs',
    description: 'Browser security & identity for hostile environments.',
    url: 'https://tindalabs.dev',
    siteName: 'Tindalabs',
    type: 'website',
  },
};

const blindspotConfig = {
  serviceName: 'tindalabs-dev',
  endpoint: '/v1/traces',
  privacy: { consentRequired: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BlindspotProvider config={blindspotConfig}>
          {children}
        </BlindspotProvider>
      </body>
    </html>
  );
}
