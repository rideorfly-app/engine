/*
 * @rideorfly/engine: the open-source scoring engine behind Ride or Fly.
 *
 * score() is the heart of it: answers and lookups in, every line, the comfort
 * breakdown, and the verdict out. Everything is a pure function: no network,
 * no clock, no randomness, and no affiliate data.
 */

export * from './defaults';
export * from './format';
export { straightLineMiles } from './geo';
export { roundCost, roundMinutes } from './rounding';
export { score } from './score';
export { GAS_REGION_BY_STATE, isSupportedState } from './states';
export type * from './types';
export type * from './units';
export {
	ANSWER_RANGES,
	ASSUMPTION_RANGES,
	type Problem,
	type Range,
	validateAnswers,
	validateAssumptions,
} from './validate';
export { ENGINE_VERSION } from './version';
