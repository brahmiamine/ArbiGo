import type { ReactNode } from 'react';
import type { Equipment } from '@/domain/types';
import { palette } from '@/domain/equipment';

export function JerseyArt({ color, label }: { color?: string; label: string }) {
  return (
    <svg className="jersey-art" viewBox="0 0 100 100" role="img" aria-label={label}>
      <ellipse cx="50" cy="92" rx="29" ry="4" fill="#172841" opacity=".08" />
      <path
        className="jersey-fabric"
        d="m31 12 11-4h16l11 4 23 18-13 18-11-7v45H32V41l-11 7L8 30Z"
        fill={palette[color ?? ''] ?? '#e4eaf2'}
        stroke="#172841"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="m42 8 8 12 8-12" fill="#fff" fillOpacity=".8" stroke="#172841" strokeWidth="1.5" />
      <path d="m32 41 6 7v38h-6Zm36 0-6 7v38h6Z" fill="#172841" opacity=".15" />
      <path d="m13 27 13 17m48 0 13-17" stroke="#fff" strokeWidth="4" opacity=".65" />
      <path d="M59 29h7v7l-3.5 3L59 36Z" fill="#fff" opacity=".85" />
      <path d="M38 81h24" stroke="#fff" opacity=".3" />
    </svg>
  );
}

export function EquipmentArt({ item }: { item: Equipment }) {
  const color = palette[item.colors[0]] ?? '#003287';
  if (item.type === 'SHIRT') return <JerseyArt color={item.colors[0]} label={item.label} />;
  let drawing: ReactNode;
  switch (item.type) {
    case 'SHORTS':
      drawing = (
        <>
          <path d="M25 18h50l6 61-27 3-4-30-4 30-27-3Z" fill={color} />
          <path d="M25 25h50M50 28v13" stroke="#fff" strokeWidth="3" />
          <path d="m29 34-4 38m46-38 4 38" stroke="#fff" opacity=".5" strokeWidth="4" />
        </>
      );
      break;
    case 'SOCKS':
      drawing = (
        <>
          <path
            d="M22 14h21v46l-9 22H14L9 72l13-15Zm36 0h21v46l-9 22H50l-5-10 13-15Z"
            fill={color}
          />
          <path d="M22 23h21m15 0h21M22 30h21m15 0h21" stroke="#fff" opacity=".8" strokeWidth="3" />
        </>
      );
      break;
    case 'SHOES':
      drawing = (
        <>
          <path d="M14 42c9 11 17 8 22-9l15 17 29 10c7 2 9 7 7 14H12Z" fill={color} />
          <path d="M12 74h75M39 44l-8 6m16 0-8 6m16 0-8 6" stroke="#fff" strokeWidth="3" />
          <path d="M20 77v6m17-6v6m27-6v6m15-6v6" stroke="#172841" strokeWidth="5" />
        </>
      );
      break;
    default:
      switch (item.id) {
        case 'badge':
          drawing = (
            <>
              <path
                d="M22 16h56v34c0 21-28 37-28 37S22 71 22 50Z"
                fill="#003287"
                stroke="#be965a"
                strokeWidth="4"
              />
              <path d="m50 28 5 11 12 2-9 9 2 12-10-6-10 6 2-12-9-9 12-2Z" fill="#be965a" />
            </>
          );
          break;
        case 'watch':
          drawing = (
            <>
              <path d="M38 6h24v88H38Z" fill="#172841" />
              <rect x="27" y="27" width="46" height="46" rx="13" fill="#89939b" />
              <rect x="32" y="32" width="36" height="36" rx="9" fill="#e0f2eb" />
              <path d="M50 38v14l9 5" fill="none" stroke="#172841" strokeWidth="3" />
              <path d="M74 40h5v13h-5" fill="#172841" />
            </>
          );
          break;
        case 'whistle':
          drawing = (
            <>
              <path
                d="M24 57C2 27 35 6 55 30l28 2v23H58c-5 25-26 31-34 2Z"
                fill="#be965a"
                stroke="#172841"
                strokeWidth="2"
              />
              <circle cx="38" cy="48" r="12" fill="#172841" />
              <path
                d="M64 32v12h12V32M22 65C2 81 34 95 50 76"
                fill="none"
                stroke="#172841"
                strokeWidth="3"
              />
            </>
          );
          break;
        case 'cards':
          drawing = (
            <>
              <rect
                x="13"
                y="14"
                width="43"
                height="61"
                rx="4"
                fill="#e60028"
                transform="rotate(-10 34 44)"
              />
              <rect
                x="42"
                y="24"
                width="43"
                height="61"
                rx="4"
                fill="#f2d429"
                transform="rotate(9 63 55)"
              />
              <path d="M22 25h20" stroke="#fff" opacity=".4" strokeWidth="3" />
            </>
          );
          break;
        case 'pens':
          drawing = (
            <>
              <path d="m26 74 36-58 11 7-36 58-14 8Z" fill="#003287" />
              <path d="m43 76 31-50 9 6-31 50-13 7Z" fill="#be965a" />
              <path d="m23 89 3-15 11 7Zm16 0 4-13 9 6Z" fill="#172841" />
              <path d="m60 18 7 5-12 19" stroke="#fff" strokeWidth="2" fill="none" />
            </>
          );
          break;
        case 'coin':
          drawing = (
            <>
              <ellipse cx="50" cy="53" rx="32" ry="34" fill="#93703b" />
              <circle cx="50" cy="47" r="32" fill="#e3bd6d" />
              <circle cx="50" cy="47" r="25" fill="none" stroke="#93703b" strokeWidth="2" />
              <path d="m50 30 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2Z" fill="#93703b" />
            </>
          );
          break;
        case 'warmup-kit':
          drawing = (
            <>
              <path d="m31 16 12-5h14l12 5 18 45-15 5-9-23v44H29V43l-8 23-14-5Z" fill="#003287" />
              <path d="M50 13v73m-18-68 8 8m28-8-8 8" stroke="#fff" strokeWidth="3" />
              <path d="M36 69h8m12 0h8" stroke="#be965a" strokeWidth="3" />
            </>
          );
          break;
        case 'shower':
          drawing = (
            <>
              <rect x="14" y="34" width="46" height="50" rx="5" fill="#20acb8" />
              <path d="M21 72h32m-32 6h32" stroke="#fff" strokeWidth="2" />
              <rect
                x="64"
                y="29"
                width="23"
                height="55"
                rx="6"
                fill="#d9e9fa"
                stroke="#003287"
                strokeWidth="2"
              />
              <path d="M70 29V17h11v12" fill="#003287" />
              <path d="M70 47h11v18H70Z" fill="#003287" />
            </>
          );
          break;
        case 'flags':
          drawing = (
            <>
              <path d="M24 14v76m48-70v70" stroke="#172841" strokeWidth="5" />
              <path d="M26 14h40v33H26Z" fill="#f2d429" />
              <path d="M26 14h20v16H26Zm20 16h20v17H46Z" fill="#ed8832" />
              <path d="M49 22h22v33H49Z" fill="#ed8832" />
            </>
          );
          break;
        case 'gloves':
          drawing = (
            <>
              <path
                d="M25 83 16 62 8 50q-3-7 4-8l12 10V22q0-9 8-6v27-30q3-8 9-3v32-26q5-7 10 0v27-20q6-6 10 1v38L49 83Z"
                fill="#172841"
              />
              <path d="m57 84 2-23 9-18q5-8 10-3l-6 16 8-25q6-5 10 1L81 67 77 84Z" fill="#003287" />
              <path d="M25 75h25m10 1h18" stroke="#be965a" strokeWidth="4" />
            </>
          );
          break;
        default:
          drawing = (
            <>
              <rect x="22" y="24" width="56" height="63" rx="12" fill={color} />
              <path d="M37 25v-7q13-14 26 0v7" fill="none" stroke="#172841" strokeWidth="4" />
              <rect x="31" y="54" width="38" height="24" rx="5" fill="#fff" opacity=".25" />
              <path d="M32 42h36" stroke="#fff" strokeWidth="3" />
            </>
          );
      }
  }
  return (
    <svg className="equipment-art" viewBox="0 0 100 100" role="img" aria-label={item.label}>
      <ellipse cx="50" cy="92" rx="32" ry="4" fill="#172841" opacity=".08" />
      {drawing}
    </svg>
  );
}
