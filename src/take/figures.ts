/*
 * Named figures. Our take never writes a number itself: it writes a
 * placeholder such as {cost_diff}, and code fills it in with the page's own
 * formatting, so every figure in the take matches the numbers exactly.
 */

import { roadRiskRatio } from '../comfort';
import { formatDuration, formatMiles, formatMoney } from '../format';
import { roundCost } from '../rounding';
import type { Answers, Lookups, Result } from '../types';
import type { Figure } from './types';

/**
 * The figures a take for this matchup may quote. Ones that don't apply, such
 * as hotel nights on a short drive, are left out, so the take can't use them.
 */
export function figuresFor(answers: Answers, lookups: Lookups, result: Result): Figure[] {
	const { ride, fly } = result;
	const travelers = answers.adults + answers.children;
	const figures: Figure[] = [];
	const add = (name: string, meaning: string, value: string) =>
		figures.push({ name, meaning, value });

	add('ride_cost', 'Total cost to drive', formatMoney(ride.cost));
	add('ride_time', 'Door to door, driving', formatDuration(ride.minutes));
	add('ride_drive_time', 'Hours behind the wheel', formatDuration(ride.drivingMinutes));
	add('ride_miles', 'Driving distance', formatMiles(lookups.drive.miles));
	add('ride_comfort', 'Ride comfort score', `${ride.comfort.toFixed(1)} out of 10`);

	if (ride.days > 1) {
		add('ride_drive_days', 'Days the drive takes', `${ride.days} days`);
		add(
			'hotel_nights',
			'Hotel nights on the way',
			`${ride.nights} ${ride.nights === 1 ? 'night' : 'nights'}`,
		);
	}

	if (travelers > 1) {
		add(
			'ride_cost_per_person',
			'Driving cost per traveler',
			formatMoney(roundCost(ride.cost / travelers)),
		);
	}

	add(
		'road_risk_vs_national',
		"The route's road fatality rate against the national rate",
		`${roadRiskRatio(lookups).toFixed(2)} times the national rate`,
	);

	if (fly) {
		const costDiff = Math.abs(fly.cost - ride.cost);

		add('fly_cost', 'Total cost to fly', formatMoney(fly.cost));
		add('fly_time', 'Door to door, flying', formatDuration(fly.minutes));
		add('fly_comfort', 'Fly comfort score', `${fly.comfort.toFixed(1)} out of 10`);
		add('fare_per_person', 'Fare per traveler', formatMoney(fly.farePerPerson));
		add('cost_diff', 'How much cheaper the cheaper side is', formatMoney(costDiff));
		add(
			'time_diff',
			'How much faster the faster side is',
			formatDuration(Math.abs(fly.minutes - ride.minutes)),
		);

		if (travelers > 1) {
			add(
				'fly_cost_per_person',
				'Flying cost per traveler',
				formatMoney(roundCost(fly.cost / travelers)),
			);
			add(
				'cost_diff_per_person',
				'The cost difference per traveler',
				formatMoney(roundCost(costDiff / travelers)),
			);
		}
	}

	return figures;
}
