import { rmSync } from 'node:fs';
import { join } from 'node:path';

const targets = ['.next', '.next-dev'].map((dir) => join(process.cwd(), dir));

for (const target of targets) {
  try {
    rmSync(target, { recursive: true, force: true });
  } catch (_error) {
    // Ignore cleanup failures for missing or locked cache folders.
  }
}
