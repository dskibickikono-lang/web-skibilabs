import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { typoHtml } from '../src/lib/typography.ts';

async function htmlFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/**
 * Po zbudowaniu strony wstawia twarde spacje po jednoliterowych spójnikach
 * i przed myślnikami we wszystkich plikach HTML.
 */
export default function typography(): AstroIntegration {
  return {
    name: 'skibilabs-typography',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const files = await htmlFiles(fileURLToPath(dir));
        let changed = 0;
        for (const file of files) {
          const before = await readFile(file, 'utf8');
          const after = typoHtml(before);
          if (after !== before) {
            await writeFile(file, after);
            changed += 1;
          }
        }
        logger.info(`twarde spacje: ${changed} z ${files.length} plików HTML`);
      },
    },
  };
}
