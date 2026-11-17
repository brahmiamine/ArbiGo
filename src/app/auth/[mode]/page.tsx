import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { AuthForm } from '@/features/auth/auth-form';
export default async function Page({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (!['login', 'register', 'forgot', 'reset', 'verify'].includes(mode)) notFound();
  return (
    <Suspense>
      <AuthForm mode={mode as 'login' | 'register' | 'forgot' | 'reset' | 'verify'} />
    </Suspense>
  );
}
