/*
 * The states the MVP covers, and the EIA gas region each belongs to.
 *
 * Launch covers the lower 48 states and DC. Alaska, Hawaii, and the
 * territories come later: they can't be driven to, except Alaska through
 * Canada.
 */

import type { GasRegion } from './types';
import type { StateCode } from './units';

/** Each supported state's EIA retail gasoline region. */
export const GAS_REGION_BY_STATE: Readonly<Record<StateCode, GasRegion>> = {
	// New England (PADD 1A)
	CT: 'new-england',
	MA: 'new-england',
	ME: 'new-england',
	NH: 'new-england',
	RI: 'new-england',
	VT: 'new-england',

	// Central Atlantic (PADD 1B)
	DC: 'central-atlantic',
	DE: 'central-atlantic',
	MD: 'central-atlantic',
	NJ: 'central-atlantic',
	NY: 'central-atlantic',
	PA: 'central-atlantic',

	// Lower Atlantic (PADD 1C)
	FL: 'lower-atlantic',
	GA: 'lower-atlantic',
	NC: 'lower-atlantic',
	SC: 'lower-atlantic',
	VA: 'lower-atlantic',
	WV: 'lower-atlantic',

	// Midwest (PADD 2)
	IA: 'midwest',
	IL: 'midwest',
	IN: 'midwest',
	KS: 'midwest',
	KY: 'midwest',
	MI: 'midwest',
	MN: 'midwest',
	MO: 'midwest',
	ND: 'midwest',
	NE: 'midwest',
	OH: 'midwest',
	OK: 'midwest',
	SD: 'midwest',
	TN: 'midwest',
	WI: 'midwest',

	// Gulf Coast (PADD 3)
	AL: 'gulf-coast',
	AR: 'gulf-coast',
	LA: 'gulf-coast',
	MS: 'gulf-coast',
	NM: 'gulf-coast',
	TX: 'gulf-coast',

	// Rocky Mountain (PADD 4)
	CO: 'rocky-mountain',
	ID: 'rocky-mountain',
	MT: 'rocky-mountain',
	UT: 'rocky-mountain',
	WY: 'rocky-mountain',

	// West Coast (PADD 5), with California reported on its own
	AZ: 'west-coast',
	NV: 'west-coast',
	OR: 'west-coast',
	WA: 'west-coast',
	CA: 'california',
};

/** Whether a place's state is covered at launch. */
export function isSupportedState(state: StateCode): boolean {
	return Object.hasOwn(GAS_REGION_BY_STATE, state);
}
