'use client';
import dynamic from 'next/dynamic';
import { useApp } from '../app-provider';
const QuizApp = dynamic(() => import('./QuizApp'), {
  ssr: false,
  loading: () => <p role="status">Chargement du quiz…</p>,
});
export function QuizScreen() {
  const { profile } = useApp();
  return (
    <>
      <div className="quiz-app">{profile && <QuizApp key={profile.id} ownerId={profile.id} />}</div>
    </>
  );
}
