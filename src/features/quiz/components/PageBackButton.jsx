import { BackButton } from '@/components/back-button';

export default function PageBackButton({ onBack }) {
  return (
    <div className="quiz-header quiz-page-back">
      <BackButton onClick={onBack} />
    </div>
  );
}
