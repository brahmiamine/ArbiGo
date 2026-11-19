import { expect, it } from 'vitest';
import { detectTeamLogoRegions, type OcrWord } from '@/domain/designation/team-logos';
const words: OcrWord[] = [
  { text: 'MAYDAY', line: '1', left: 0.1, top: 0.5, width: 0.15, height: 0.05 },
  { text: 'FC', line: '1', left: 0.26, top: 0.5, width: 0.06, height: 0.05 },
  { text: 'BENFICA', line: '1', left: 0.65, top: 0.5, width: 0.2, height: 0.05 },
];
const teams = { homeTeam: 'MAYDAY FC', awayTeam: 'BENFICA' };
function screenshot() {
  const width = 400,
    height = 240,
    data = new Uint8ClampedArray(width * height * 4).fill(255);
  const rect = (x: number, y: number, w: number, h: number, rgb: number[]) => {
    for (let row = y; row < y + h; row++)
      for (let col = x; col < x + w; col++) data.set([...rgb, 255], (row * width + col) * 4);
  };
  return { image: { width, height, data }, rect };
}
it('extracts two separate badge regions near the recognized team names, ignoring a page banner', () => {
  const { image, rect } = screenshot();
  rect(0, 0, 400, 20, [30, 40, 120]);
  rect(65, 65, 30, 35, [210, 20, 50]);
  rect(275, 65, 30, 35, [20, 50, 210]);
  const result = detectTeamLogoRegions(image, words, teams);
  expect(result.home).toBeDefined();
  expect(result.away).toBeDefined();
  expect(result.home!.left).toBeLessThan(65 / 400);
  expect(result.home!.left + result.home!.width).toBeGreaterThan(95 / 400);
  expect(result.away!.left).toBeGreaterThan(0.6);
  expect(result.away!.top).toBeGreaterThan(0.2);
});
it('does not invent logos when only text is present or team names cannot be located', () => {
  const { image, rect } = screenshot();
  rect(40, 120, 88, 12, [20, 20, 20]);
  rect(260, 120, 80, 12, [20, 20, 20]);
  expect(detectTeamLogoRegions(image, words, teams)).toEqual({});
  rect(65, 65, 30, 35, [210, 20, 50]);
  expect(detectTeamLogoRegions(image, [], teams)).toEqual({});
});
it('keeps one visible logo on its own side instead of assigning it to both teams', () => {
  const { image, rect } = screenshot();
  rect(65, 65, 30, 35, [210, 20, 50]);
  const result = detectTeamLogoRegions(image, words, teams);
  expect(result.home).toBeDefined();
  expect(result.away).toBeUndefined();
});

it('finds a logo beside a long team name instead of measuring from the text center', () => {
  const { image, rect } = screenshot();
  rect(65, 110, 30, 35, [20, 50, 210]);
  const row: OcrWord[] = [
    { text: 'BENFICA', line: '2', left: 0.4, top: 0.5, width: 0.2, height: 0.05 },
    { text: 'ARGOSELO', line: '2', left: 0.62, top: 0.5, width: 0.25, height: 0.05 },
  ];
  expect(detectTeamLogoRegions(image, row, { awayTeam: 'BENFICA ARGOSELO S.' }).away).toBeDefined();
});

it('does not mistake a colored letter in a recognized team name for its logo', () => {
  const { image, rect } = screenshot();
  rect(60, 120, 12, 12, [210, 20, 50]);
  expect(detectTeamLogoRegions(image, words, teams)).toEqual({});
});
