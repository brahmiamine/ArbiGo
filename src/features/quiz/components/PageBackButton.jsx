import { Button } from '@/components/ui';
import { useEffect } from 'react';

export default function PageBackButton({ onBack }) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="quiz-header quiz-page-back">
      <div className="quiz-header-actions">
        <Button type="button" variant="ghost" className="btn-link" onClick={onBack}>
          ← Retour
        </Button>
      </div>
    </div>
  );
}
