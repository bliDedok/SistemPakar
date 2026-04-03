'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    
    // Simulasi pengecekan auth (sesuaikan dengan logic kamu)
    const checkAuth = async () => {
      try {
        // Misal: ambil token dari localStorage atau hit API profile
        setIsLoading(false);
      } catch (error) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  // JANGAN render apa pun sebelum mounted untuk menghindari Hydration Error
  if (!isMounted) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="font-medium">Memeriksa akses admin...</p>
      </div>
    );
  }

  return <>{children}</>;
}