import { db } from '../src/lib/db';
import { templates } from '../src/domain/templates';
for (const template of Object.values(templates)) {
  await db.templateVersion.upsert({
    where: { code: template.code },
    create: {
      code: template.code,
      practice: template.practice,
      season: template.season,
      version: template.version,
      status: template.status,
      content: JSON.parse(JSON.stringify(template)),
    },
    update: {},
  });
}
await db.$disconnect();
