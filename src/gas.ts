import { GAS_REGION_BY_STATE } from './states';
import type { Lookups } from './types';
import type { Dollars, Miles, StateCode } from './units';

/** Regular gas in one state, from its EIA region, or the national price if the region's missing. */
export function stateGasPrice(lookups: Lookups, state: StateCode): Dollars {
	const region = GAS_REGION_BY_STATE[state];
	const price = region ? lookups.gas.byRegion[region] : undefined;

	return price ?? lookups.gas.national;
}

/** The route's gas price, weighted by how many of its miles fall in each state. */
export function routeGasPrice(lookups: Lookups): Dollars {
	const entries = Object.entries(lookups.drive.milesByState) as Array<[StateCode, Miles]>;
	const miles = entries.reduce((total, [, stateMiles]) => total + stateMiles, 0);

	if (miles === 0) {
		return lookups.gas.national;
	}

	const weighted = entries.reduce(
		(total, [state, stateMiles]) => total + stateGasPrice(lookups, state) * stateMiles,
		0,
	);

	return weighted / miles;
}
