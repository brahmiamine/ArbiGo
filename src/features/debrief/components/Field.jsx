import { memo } from 'react';

/**
 * Champ texte (ou date/heure).
 * `onChange(name, value, index)` : l'index est transmis uniquement pour les champs de tableau.
 */
function Field({
  label,
  name,
  index,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  className = '',
}) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      <input
        type={type}
        maxLength={
          name === 'matchNumber' ||
          name === 'referee' ||
          name === 'assistant1' ||
          name === 'assistant2' ||
          name === 'homeTeam' ||
          name === 'awayTeam' ||
          name === 'competition'
            ? 200
            : 5000
        }
        value={value}
        onChange={(event) => onChange(name, event.target.value, index)}
        placeholder={placeholder}
      />
    </label>
  );
}

export default memo(Field);
