'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectDomain() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/tools/domain_check');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1110] text-slate-400 text-sm">
      Redirecting to /tools/domain_check…
    </div>
  );
}
