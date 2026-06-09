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

// Site-wide Blindspot instrumentation. There is no collector behind the static
// site, so the endpoint is a same-origin path that simply 404s — OpenTelemetry's
// default diag logger is a no-op, so failed background exports are silent and
// never touch the UI. The LiveStack demo renders real Blindspot spans in-page
// instead of shipping them to Tempo.
const blindspotConfig = {
  serviceName: 'tindalabs-dev',
  endpoint: '/otel',
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
