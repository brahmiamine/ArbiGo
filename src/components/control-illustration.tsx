import type { ReactNode } from 'react';

/** Visual landmarks for the object being checked, served inline for offline preparation. */
export function ControlIllustration({ code, label }: { code: string; label: string }) {
  let drawing: ReactNode;
  let detail: string;
  switch (code) {
    case 'corners':
      detail = 'Poteau et drapeau au coin du terrain';
      drawing = (
        <>
          <path d="M9 73h94V52" stroke="#fff" strokeWidth="3" />
          <path d="M74 73a27 27 0 0 1 29-27" stroke="#fff" />
          <path d="M73 69V12" stroke="#172841" strokeWidth="3" />
          <path d="m75 12 25 4-25 18Z" fill="#ef8832" />
          <path d="m75 12 12 2v13l-12 7Z" fill="#f2d429" />
        </>
      );
      break;
    case 'nets':
      detail = 'Maille et attaches du filet sur le cadre du but';
      drawing = (
        <>
          <path d="M21 71V16h71v55" stroke="#fff" strokeWidth="6" />
          <path
            d="M26 21h61v50H26Z M26 31h61M26 41h61M26 51h61M26 61h61M37 21v50M49 21v50M61 21v50M73 21v50"
            stroke="#8cb6a7"
          />
          <circle cx="23" cy="26" r="6" fill="#be965a" />
          <circle cx="23" cy="48" r="6" fill="#be965a" />
          <circle cx="52" cy="18" r="6" fill="#be965a" />
        </>
      );
      break;
    case 'goals':
      detail = 'Cadre du but et points de fixation au sol';
      drawing = (
        <>
          <path d="M20 66V20h57v46m0-46 23 14v34M20 66h80L77 53" stroke="#fff" strokeWidth="5" />
          <path d="M77 20v33m0-28 23 14M82 29v25m6-21v26m6-22v26" stroke="#a8c4bd" />
          <path d="M14 65h16v10H14Zm55-3h16v12H69Zm22 1h15v12H91Z" fill="#172841" />
          <path d="M22 63v16m55-18v18m21-17v17" stroke="#be965a" strokeWidth="3" />
        </>
      );
      break;
    case 'lines':
      detail = 'Lignes de touche, de but et marquages du terrain';
      drawing = (
        <g stroke="#fff" strokeWidth="2.5">
          <rect x="12" y="14" width="96" height="60" rx="1" />
          <path d="M60 14v60M12 28h17v31H12m96-31H91v31h17" />
          <circle cx="60" cy="44" r="11" />
        </g>
      );
      break;
    case 'surface':
      detail = 'Trous, objets et obstacles sur la surface et ses abords';
      drawing = (
        <>
          <path d="M10 68h100" stroke="#fff" strokeWidth="2" />
          <ellipse cx="42" cy="56" rx="22" ry="9" fill="#6b513c" />
          <ellipse cx="42" cy="54" rx="16" ry="5" fill="#ac8a65" />
          <path d="m80 23 22 39H58Z" fill="#f7d79c" stroke="#b57b24" strokeWidth="2" />
          <path d="M80 36v12" stroke="#172841" strokeWidth="3" />
          <circle cx="80" cy="54" r="2" fill="#172841" />
        </>
      );
      break;
    case 'ball':
      detail = 'Revêtement, forme et état du ballon';
      drawing = (
        <>
          <circle cx="60" cy="44" r="32" fill="#fff" stroke="#172841" strokeWidth="2" />
          <path
            d="m60 30 13 10-5 16H52l-5-16Z M35 24l7 9-11 15-3-6m57-18-7 9 11 15 3-6M39 67l10-10m32 10L71 57M51 15l9 15 9-15"
            fill="#172841"
            stroke="#172841"
            strokeWidth="2"
          />
          <path d="m31 49 21 7m37-7-21 7" stroke="#172841" />
        </>
      );
      break;
    case 'table':
    case 'table-signals':
    case 'officials':
      detail = 'Table des officiels, chronomètre et communication';
      drawing = (
        <>
          <path d="M15 46h90v8H15Zm8 8v22m74-22v22" stroke="#172841" strokeWidth="4" />
          <rect x="30" y="19" width="60" height="28" rx="4" fill="#172841" />
          <text x="60" y="39" textAnchor="middle" fill="#fff" fontSize="17" fontFamily="monospace">
            20:00
          </text>
          <path d="M14 43h12m69 0h12" stroke="#be965a" strokeWidth="4" />
        </>
      );
      break;
    case 'identity':
      detail = 'Identité du joueur et informations sur le support de match';
      drawing = (
        <>
          <rect x="17" y="16" width="86" height="57" rx="6" fill="#fff" stroke="#b8c8df" />
          <circle cx="40" cy="36" r="9" fill="#be965a" />
          <path d="M25 62c0-21 30-21 30 0" fill="#003287" />
          <path d="M65 32h25M65 44h25M65 56h17" stroke="#97abc5" strokeWidth="4" />
        </>
      );
      break;
    case 'equipment':
      detail = 'Chaussures, protège-tibias et objets dangereux';
      drawing = (
        <>
          <path d="M12 54c12 4 14-3 19-14l14 13 23 8c6 2 9 6 8 12H12Z" fill="#172841" />
          <path d="m35 51-8 6m16 0-8 6M13 73h63" stroke="#fff" strokeWidth="2" />
          <path d="m82 19 18 3-4 29c-4 8-9 8-13 0Z" fill="#fff" stroke="#003287" strokeWidth="2" />
          <path d="m88 27 6 1-2 16" stroke="#be965a" strokeWidth="3" />
        </>
      );
      break;
    case 'keepers':
      detail = 'Maillots distincts des gardiens';
      drawing = (
        <>
          <path
            d="m17 24 13-7h14l13 7 9 15-11 7-5-8v33H24V38l-5 8-11-7Z"
            fill="#f2d429"
            stroke="#172841"
          />
          <path
            d="m70 24 10-7h14l10 7 9 15-9 7-5-8v33H75V38l-5 8-9-7Z"
            fill="#7d59ac"
            stroke="#172841"
          />
          <path d="m30 17 7 10 7-10m36 0 7 10 7-10" stroke="#fff" strokeWidth="3" />
        </>
      );
      break;
    case 'toss':
      detail = 'Pièce utilisée pour le tirage au sort';
      drawing = (
        <>
          <ellipse cx="60" cy="48" rx="27" ry="29" fill="#be965a" />
          <ellipse
            cx="60"
            cy="43"
            rx="27"
            ry="29"
            fill="#f7d79c"
            stroke="#be965a"
            strokeWidth="3"
          />
          <path d="M49 43h22m-11-11v22" stroke="#be965a" strokeWidth="4" />
          <path d="m25 23 4-6m64 6-4-6" stroke="#fff" strokeWidth="3" />
        </>
      );
      break;
    case 'positions':
    case 'protocol':
      detail = 'Joueurs et officiels réunis avant le coup d’envoi';
      drawing = (
        <>
          <path d="M10 71h100" stroke="#fff" strokeWidth="2" />
          {[30, 60, 90].map((x, i) => (
            <g key={x}>
              <circle cx={x} cy="24" r="8" fill="#be965a" />
              <path
                d={`M${x - 11} 65V44c0-16 22-16 22 0v21`}
                fill={i === 1 ? '#f2d429' : '#003287'}
                stroke="#172841"
              />
              <path d={`M${x - 5} 65v10m10-10v10`} stroke="#172841" strokeWidth="4" />
            </g>
          ))}
        </>
      );
      break;
    default:
      detail = 'Support de la rencontre et informations à contrôler';
      drawing = (
        <>
          <rect x="28" y="9" width="64" height="70" rx="4" fill="#fff" stroke="#b8c8df" />
          <rect x="44" y="6" width="32" height="9" rx="3" fill="#be965a" />
          <path
            d="M40 28h40M40 41h40M40 54h40M40 67h40M51 22v50M70 22v50"
            stroke="#97abc5"
            strokeWidth="1.5"
          />
        </>
      );
  }
  return (
    <svg
      className="control-illustration"
      viewBox="0 0 120 88"
      role="img"
      aria-label={`${label} · ${detail}`}
    >
      <rect
        width="120"
        height="88"
        rx="12"
        fill={
          ['corners', 'nets', 'goals', 'lines', 'surface'].includes(code) ? '#74a48d' : '#edf2fa'
        }
      />
      {drawing}
    </svg>
  );
}
