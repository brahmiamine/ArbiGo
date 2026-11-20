'use client';
import dynamic from 'next/dynamic';
import { useApp } from '../app-provider';
const QuizApp = dynamic(() => import('./QuizApp'), {
  ssr: false,
  loading: () => <p role="status">Chargement du quiz…</p>,
});
export function QuizScreen({ area = 'play' }: { area?: 'play' | 'profile' | 'documents' }) {
  const { profile } = useApp();
  return (
    <>
      <div className={`quiz-app quiz-area-${area === 'documents' ? 'profile' : area}`}>
        {profile && <QuizApp key={profile.id} ownerId={profile.id} area={area} />}
      </div>
    </>
  );
}
