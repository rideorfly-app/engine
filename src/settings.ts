import type { Dollars, Hours, Minutes } from './units';

/** The assumptions a side is built with, after the user's changes. */
export interface Settings {
	maxDrivingHours: Hours;
	gasPrice?: Dollars;
	mpg?: number;
	arrivalBufferMinutes?: Minutes;

	/** Stop at hotels when a drive passes the daily limit, rather than driving straight through. */
	hotel: boolean;
}
