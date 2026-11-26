import { ArrowLeft } from 'lucide-react';

/** The only "back" control of the app. Closing, cancelling or pausing use other controls. */
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="back-button"
      aria-label="Retour"
      title="Retour"
      onClick={onClick}
    >
      <ArrowLeft size={22} aria-hidden="true" />
    </button>
  );
}
