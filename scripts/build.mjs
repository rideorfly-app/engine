// Builds the one file Ride or Fly serves: dist/engine.min.js.
//
// The output must be reproducible, so the same commit always produces the same
// bytes. That's what lets anyone compare the hash on the site's Verify page
// with a build of this repo. Keep anything that varies between machines or
// runs (timestamps, absolute paths) out of the output.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, rmSync } from 'node:fs';
import { build } from 'esbuild';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const outfile = 'dist/engine.min.js';

rmSync('dist', { recursive: true, force: true });

await build({
	entryPoints: ['src/index.ts'],
	outfile,
	bundle: true,
	minify: true,
	format: 'esm',
	platform: 'neutral',
	target: 'es2022',
	legalComments: 'none',
	banner: { js: `/*! ${pkg.name} ${pkg.version} | Apache-2.0 | ${pkg.repository.url} */` },
	logLevel: 'warning',
});

// Type declarations, so the app gets the same types the engine was written with.
execFileSync('npx', ['tsc', '-p', 'tsconfig.build.json'], { stdio: 'inherit' });

// The integrity value the app's <script> tag uses.
const bytes = readFileSync(outfile);
const sri = `sha384-${createHash('sha384').update(bytes).digest('base64')}`;

console.log(`${outfile}  ${bytes.length} bytes`);
console.log(`integrity   ${sri}`);
