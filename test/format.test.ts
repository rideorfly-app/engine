import { describe, expect, it } from 'vitest';
import {
	formatDrivingDays,
	formatDuration,
	formatDurationChange,
	formatMiles,
	formatMoney,
	formatMoneyChange,
} from '../src/format';

describe('formatMoney', () => {
	it('shows whole dollars without cents', () => {
		expect(formatMoney(1050)).toBe('$1,050');
		expect(formatMoney(129)).toBe('$129');
		expect(formatMoney(0)).toBe('$0');
	});

	it('shows cents when there are any', () => {
		expect(formatMoney(3.1)).toBe('$3.10');
		expect(formatMoney(4.674)).toBe('$4.67');
	});

	it('groups large amounts', () => {
		expect(formatMoney(1234567)).toBe('$1,234,567');
	});
});

describe('formatDuration', () => {
	it('shows hours and padded minutes', () => {
		expect(formatDuration(550)).toBe('9h 10m');
		expect(formatDuration(480)).toBe('8h 00m');
		expect(formatDuration(65)).toBe('1h 05m');
	});

	it('shows minutes alone under an hour', () => {
		expect(formatDuration(45)).toBe('45m');
		expect(formatDuration(0)).toBe('0m');
	});
});

describe('formatMiles', () => {
	it('rounds and pluralizes', () => {
		expect(formatMiles(539.6)).toBe('540 miles');
		expect(formatMiles(1)).toBe('1 mile');
		expect(formatMiles(2450)).toBe('2,450 miles');
	});
});

describe('formatDrivingDays', () => {
	it('names the days and the driving', () => {
		expect(formatDrivingDays(3, 1320)).toBe('3 days, 22h 00m of driving');
	});
});

describe('changes', () => {
	it('signs money changes with a real minus', () => {
		expect(formatMoneyChange(40)).toBe('+$40');
		expect(formatMoneyChange(-85)).toBe('−$85');
		expect(formatMoneyChange(0)).toBe('$0');
	});

	it('signs time changes', () => {
		expect(formatDurationChange(190)).toBe('+3h 10m');
		expect(formatDurationChange(-25)).toBe('−25m');
	});
});
