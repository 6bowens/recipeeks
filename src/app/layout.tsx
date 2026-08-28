import './globals.css';
import { Providers } from '@/components/Providers';
import { Navbar } from '@/components/Navbar';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { AppShell } from '@/components/AppShell';

export const metadata = {
  title: 'Recipeeks — Digitize Cookbooks & Match Pantry Ingredients',
  description: 'A self-hosted, multi-user AI culinary library that scans physical cookbooks and recommends recipes you can make with your pantry ingredients.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased selection:bg-amber-200">
        <Providers>
          <AppShell>
            <ImpersonationBanner />
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              {children}
            </main>
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
