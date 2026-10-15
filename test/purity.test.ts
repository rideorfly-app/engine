/*
 * The engine must be a pure function: the same inputs give the same output,
 * in the browser and on the server. These checks keep anything that varies
 * between runs, or reaches outside, out of the engine's source.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function sourceFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);

		return entry.isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
	});
}

const FORBIDDEN: Array<[string, RegExp]> = [
	['the current time', /Date\.now\(|new Date\(\)|performance\.now\(/],
	['randomness', /Math\.random\(|crypto\./],
	['the network', /\bfetch\(|XMLHttpRequest|WebSocket/],
	['storage or the environment', /localStorage|sessionStorage|process\.|document\.|window\./],
	['a time zone', /toLocale|Intl\./],
];

describe('the engine stays pure', () => {
	for (const file of sourceFiles('src')) {
		it(`${file} doesn't read the clock, randomness, the network, or the environment`, () => {
			const source = readFileSync(file, 'utf8');

			for (const [what, pattern] of FORBIDDEN) {
				expect(pattern.test(source), `${file} uses ${what}`).toBe(false);
			}
		});
	}
});
