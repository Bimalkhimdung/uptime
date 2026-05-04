import { Background } from '@/components/landing/Background';
import { Nav } from '@/components/landing/Nav';
import { Hero } from '@/components/landing/Hero';
import { Stats } from '@/components/landing/Stats';
import { Features } from '@/components/landing/Features';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#030303] text-white overflow-hidden isolate selection:bg-violet-500/30">
      <Background />
      <Nav />
      <Hero />
      <Stats />
      <Features />
      <CTA />
      <Footer />
    </main>
  );
}
