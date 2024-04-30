import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));

pkg.main = 'src/Highlight.ts';

await writeFile('package.json', JSON.stringify(pkg, null, '\t') + '\n');

// Graceful shutdown
for (const event of [
	'SIGTERM', //
	'SIGINT',
] as const) {
	process.on(event, async () => {
		pkg.main = 'dist/Highlight.js';
		await writeFile('package.json', JSON.stringify(pkg, null, '\t') + '\n');
	});
}

// @ts-expect-error We are in Bun!
await import('./Highlight.ts');
