import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION } from '../src/version';

describe('ENGINE_VERSION', () => {
	it('matches package.json', () => {
		const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

		expect(ENGINE_VERSION).toBe(pkg.version);
	});
});
