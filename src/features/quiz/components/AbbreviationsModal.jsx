import { Modal } from '@/components/ui';
import { FOOTBALL_ABBREVIATIONS } from '../data/abbreviations';
const SORTED = [...FOOTBALL_ABBREVIATIONS].sort((a, b) =>
  a.code.localeCompare(b.code, 'fr', { numeric: true }),
);
export default function AbbreviationsModal({ open, onClose }) {
  if (!open) return null;
  return (
    <Modal title="Abréviations d’arbitrage" onClose={onClose}>
      <div className="abbreviations-list">
        {SORTED.map(({ code, label }) => (
          <div className="abbreviations-row" key={code}>
            <strong className="abbreviations-code">{code}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
