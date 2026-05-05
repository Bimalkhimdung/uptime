import { Background } from '@/components/landing/Background';
import { Nav } from '@/components/landing/Nav';
import { Hero } from '@/components/landing/Hero';
import { Logos } from '@/components/landing/Logos';
import { Stats } from '@/components/landing/Stats';
import { Features } from '@/components/landing/Features';
import { CTA } from '@/components/landing/CTA';
import { FAQ } from '@/components/landing/FAQ';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0a1110] text-white overflow-hidden isolate selection:bg-emerald-400/30">
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(60% 50% at 75% 50%, rgba(34,197,94,0.08), transparent 70%)',
        }}
      />
      <Background />
      <Nav />
      <Hero />
      <Logos />
      <Stats />
      <Features />
      <CTA />
      <FAQ />
      <Footer />
    </main>
  );
}
