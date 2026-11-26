export interface OcrWord {
  text: string;
  line: string;
  /** Coordinates normalized to the recognized image, independent of OCR enlargement. */
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface LogoRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface PixelImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

function teamAnchor(words: OcrWord[], name: string, other: string) {
  const tokens = name
    .split(/\s+/)
    .map(normalize)
    .filter((token) => token.length > 1);
  const otherTokens = new Set(other.split(/\s+/).map(normalize));
  const lines = new Map<string, OcrWord[]>();
  for (const word of words) {
    if (!tokens.includes(normalize(word.text))) continue;
    const line = lines.get(word.line) ?? [];
    line.push(word);
    lines.set(word.line, line);
  }
  const ranked = [...lines.values()]
    .map((line) => ({
      line,
      score:
        new Set(line.map((word) => normalize(word.text))).size +
        line.filter((word) => !otherTokens.has(normalize(word.text))).length * 2,
    }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || !best.line.some((word) => !otherTokens.has(normalize(word.text)))) return undefined;
  return {
    left: Math.min(...best.line.map((word) => word.left)),
    top: Math.min(...best.line.map((word) => word.top)),
    right: Math.max(...best.line.map((word) => word.left + word.width)),
    bottom: Math.max(...best.line.map((word) => word.top + word.height)),
  };
}

/** Conservative image candidates near OCR team names. No badge is synthesized or looked up. */
export function detectTeamLogoRegions(
  image: PixelImage,
  words: OcrWord[],
  teams: { homeTeam?: string; awayTeam?: string },
): Partial<Record<'home' | 'away', LogoRegion>> {
  const { width, height, data } = image;
  if (!words.length || !width || !height) return {};
  const cell = 3,
    cols = Math.ceil(width / cell),
    rows = Math.ceil(height / cell);
  const mask = new Uint8Array(cols * rows);
  // Text must not become a badge, even when the team name is printed in color.
  const textMask = new Uint8Array(width * height);
  // OCR sometimes "reads" a badge itself as a short word with a badge-sized box: erasing it
  // would destroy the logo. Real text stays close to the usual word height.
  const heights = words.map((word) => word.height).sort((a, b) => a - b);
  const tallest = heights[Math.floor(heights.length / 2)] * 2.5;
  for (const word of words) {
    const text = normalize(word.text);
    if (text.length < 2 || (text.length <= 3 && word.height > tallest)) continue;
    const x1 = Math.max(0, Math.floor(word.left * width) - 2),
      x2 = Math.min(width, Math.ceil((word.left + word.width) * width) + 2);
    const y1 = Math.max(0, Math.floor(word.top * height) - 2),
      y2 = Math.min(height, Math.ceil((word.top + word.height) * height) + 2);
    for (let y = y1; y < y2; y++) textMask.fill(1, y * width + x1, y * width + x2);
  }
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4,
        hi = Math.max(data[i], data[i + 1], data[i + 2]),
        lo = Math.min(data[i], data[i + 1], data[i + 2]);
      const colored = hi - lo > 35 && lo < 220;
      if (data[i + 3] > 100 && !textMask[y * width + x] && (colored || hi < 155))
        mask[Math.floor(y / cell) * cols + Math.floor(x / cell)] = 1;
    }
  const candidates: LogoRegion[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start]) continue;
    const queue = [start];
    mask[start] = 0;
    let minX = cols,
      minY = rows,
      maxX = 0,
      maxY = 0;
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head],
        x = index % cols,
        y = Math.floor(index / cols);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy,
            next = ny * cols + nx;
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows || !mask[next]) continue;
          mask[next] = 0;
          queue.push(next);
        }
    }
    const w = (maxX - minX + 1) * cell,
      h = (maxY - minY + 1) * cell;
    if (
      w < 10 ||
      h < 10 ||
      w / h < 0.35 ||
      w / h > 2 ||
      w > width * 0.28 ||
      h > height * 0.3 ||
      (queue.length * cell * cell) / (w * h) < 0.15
    )
      continue;
    const pad = Math.max(3, Math.max(w, h) * 0.1);
    const left = Math.max(0, minX * cell - pad),
      top = Math.max(0, minY * cell - pad);
    candidates.push({
      left: left / width,
      top: top / height,
      width: (Math.min(width, (maxX + 1) * cell + pad) - left) / width,
      height: (Math.min(height, (maxY + 1) * cell + pad) - top) / height,
    });
  }
  const result: Partial<Record<'home' | 'away', LogoRegion>> = {};
  const anchors = {
    home: teamAnchor(words, teams.homeTeam ?? '', teams.awayTeam ?? ''),
    away: teamAnchor(words, teams.awayTeam ?? '', teams.homeTeam ?? ''),
  };
  const used = new Set<LogoRegion>();
  for (const side of ['home', 'away'] as const) {
    const anchor = anchors[side],
      other = anchors[side === 'home' ? 'away' : 'home'];
    if (!anchor) continue;
    const distance = (r: LogoRegion, a: typeof anchor) =>
      Math.hypot(
        Math.max(a.left - r.left - r.width / 2, r.left + r.width / 2 - a.right, 0) * width,
        Math.max(a.top - r.top - r.height / 2, r.top + r.height / 2 - a.bottom, 0) * height,
      );
    const possible = candidates
      .filter(
        (r) =>
          !used.has(r) &&
          distance(r, anchor) < Math.min(width * 0.25, height * 0.4) &&
          (!other || distance(r, anchor) < distance(r, other)),
      )
      .sort((a, b) => distance(a, anchor) - distance(b, anchor));
    // Ambiguous neighboring icons are left for a manual upload.
    if (
      !possible[0] ||
      (possible[1] && distance(possible[1], anchor) < distance(possible[0], anchor) * 1.25)
    )
      continue;
    result[side] = possible[0];
    used.add(possible[0]);
  }
  return result;
}
