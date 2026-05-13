'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectPorts() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/tools/port_scan');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1110] text-slate-400 text-sm">
      Redirecting to /tools/port_scan…
    </div>
  );
}
