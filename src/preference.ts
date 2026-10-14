/*
 * The travel preference slider: −100 (Fly) to 100 (Ride), with five labels
 * that cross-fade as the thumb moves.
 */

export const PREFERENCE_LABELS = [
	'Airports are my happy place',
	"I'd rather fly, honestly",
	'No strong feelings',
	"Give me a good playlist and I'm fine",
	'The road trip is half the point',
] as const;

/** Which of the five labels a slider value shows, from 0 (Fly) to 4 (Ride). */
export function preferenceLabelIndex(preference: number): number {
	return Math.max(0, Math.min(4, Math.round((preference + 100) / 50)));
}

export function preferenceLabel(preference: number): string {
	return PREFERENCE_LABELS[preferenceLabelIndex(preference)] as string;
}
