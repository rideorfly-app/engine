import { FOOD } from './defaults';
import type { Answers, Lookups } from './types';
import type { Dollars } from './units';

/** One meal for the whole group, at the GSA lunch rate, with children's meals costing less. */
export function mealCost(answers: Answers, lookups: Pick<Lookups, 'perDiem'>): Dollars {
	const lunch = (lookups.perDiem.start.lunch + lookups.perDiem.destination.lunch) / 2;

	return lunch * (answers.adults + answers.children * FOOD.childShare);
}
