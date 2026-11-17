import { db } from '../src/lib/db';
import type { Template } from '../src/domain/types';
const [code, source] = process.argv.slice(2);
if (!code || !source) {
  throw new Error('Usage: tsx scripts/approve-template.ts CODE REFERENCE_DOCUMENTAIRE_VERIFIEE');
}
const row = await db.templateVersion.findUniqueOrThrow({ where: { code } });
const content = row.content as unknown as Template;
await db.templateVersion.update({
  where: { code },
  data: {
    status: 'VERIFIED',
    approvedAt: new Date(),
    content: JSON.parse(
      JSON.stringify({ ...content, status: 'VERIFIED', sources: [...content.sources, source] }),
    ),
  },
});
await db.$disconnect();
