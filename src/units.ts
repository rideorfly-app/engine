/*
 * Names for the plain numbers the engine passes around. They're all `number`
 * to TypeScript, so they don't force any casting; they exist so a signature
 * like `fuelCost(miles: Miles, mpg: number, price: Dollars): Dollars` says
 * what each number means.
 */

/** US dollars. Line totals are whole multiples of $5; prices behind a line keep their cents. */
export type Dollars = number;

/** Minutes. Line totals are whole multiples of 5. */
export type Minutes = number;

/** Hours, used where a rule is stated per hour (a comfort penalty, a daily limit). */
export type Hours = number;

/** Statute miles. */
export type Miles = number;

/** A probability from 0 to 1. A 20% chance is `0.2`. */
export type Chance = number;

/** A calendar date, `YYYY-MM-DD`, in the traveler's local time. */
export type IsoDate = string;

/** A calendar month, `YYYY-MM`. */
export type YearMonth = string;

/** A two-letter USPS code, such as `CO`. DC counts as a state here. */
export type StateCode = string;

/** Minutes after midnight on the first travel day, on the start's local clock. Day two's noon is `2160`. */
export type ClockMinutes = number;
