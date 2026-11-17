import { useApp } from '../app-provider';
import { defaultBriefings } from '@/domain/profile';
import type { Match, Step } from '@/domain/types';

export function Briefing({ match, step }: { match: Match; step: Step }) {
  const captains = step.code === 'captains';
  const futsal = match.practice === 'FUTSAL';
  const { profile } = useApp();
  const key = captains ? 'captains' : futsal ? 'futsalOfficials' : 'assistants';
  const text = profile?.preferences.briefings?.[key] || defaultBriefings[key];
  return (
    <div className="briefing">
      <p className="eyebrow">
        EXEMPLE À DIRE {captains ? 'AUX CAPITAINES' : futsal ? 'AUX OFFICIELS' : 'AUX ASSISTANTS'}
      </p>
      <blockquote>
        <strong>{text}</strong>
      </blockquote>
    </div>
  );
}
