import { memo } from 'react';

/**
 * Zone de texte multiligne.
 * `label` affiche un libellé visible ; `ariaLabel` nomme les zones dont le titre de section suffit
 * visuellement, pour que les lecteurs d'écran disposent malgré tout d'un intitulé.
 */
function TextArea({ label, ariaLabel, name, index, value, onChange, placeholder = '', rows = 4 }) {
  return (
    <label className="field field--textarea">
      {label ? <span>{label}</span> : null}
      <textarea
        rows={rows}
        aria-label={label || ariaLabel}
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

export default memo(TextArea);
