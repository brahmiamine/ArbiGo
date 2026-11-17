import { memo } from 'react';
import { RATING } from '@/domain/debrief/formModel';
import { formatRating } from '@/domain/debrief/formatters';

function RatingField({ value, onChange }) {
  return (
    <div className="rating-block">
      <div className="rating-value">
        <span>⭐</span>
        <strong>{formatRating(value)}</strong>
        <small>/10</small>
      </div>
      <input
        className="rating-range"
        type="range"
        aria-label="Auto-évaluation sur 10"
        aria-valuetext={`${formatRating(value)} sur 10`}
        min={RATING.min}
        max={RATING.max}
        step={RATING.step}
        value={value}
        onChange={(event) => onChange('rating', event.target.value)}
      />
      <div className="rating-scale">
        <span>{RATING.min}</span>
        <span>5</span>
        <span>{RATING.max}</span>
      </div>
    </div>
  );
}

export default memo(RatingField);
