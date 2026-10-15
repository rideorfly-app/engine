/*
 * @rideorfly/engine: the open-source scoring engine behind Ride or Fly.
 *
 * score() is the heart of it: answers and lookups in, every line, the comfort
 * breakdown, and the verdict out. Everything is a pure function: no network,
 * no clock, no randomness, and no affiliate data.
 */

export {
	type NearbyAirport,
	nearbyAirports,
	type PairCandidate,
	type RankedPair,
	rankAirportPairs,
	tooCloseToFly,
} from './airports';
export {
	type Change,
	type Comparison,
	compare,
	type Difference,
	type LineDifference,
	meaningfulChanges,
	type SideComparison,
	type Snapshot,
} from './compare';
export * from './defaults';
export {
	type DelayEstimate,
	type DelayMethod,
	expectedDelay,
	type FlightHistory,
	type FlightMonth,
} from './delay';
export * from './format';
export { straightLineMiles } from './geo';
export { PREFERENCE_LABELS, preferenceLabel, preferenceLabelIndex } from './preference';
export { roundCost, roundMinutes } from './rounding';
export { score } from './score';
export { GAS_REGION_BY_STATE, isSupportedState } from './states';
export { checkTake, type TakeCheck, type TakeCheckContext } from './take/check';
export { figuresFor } from './take/figures';
export { fillTake, fillText } from './take/fill';
export { buildTakeInput, type TakeInput, type TakeInputOptions } from './take/input';
export { TAKE_PROMPT, TAKE_PROMPT_VERSION } from './take/prompt';
export { TAKE_SCHEMA } from './take/schema';
export { writtenFromNumbers } from './take/summary';
export type * from './take/types';
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
