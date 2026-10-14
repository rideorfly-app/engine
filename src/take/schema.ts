/**
 * The JSON Schema for a take, for the model API's structured outputs. The
 * check still runs on every take, since a schema can't see placeholders.
 */
export const TAKE_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: [
		'verdict',
		'confidence',
		'summary',
		'reasons',
		'worth_considering',
		'differs_from_numbers',
		'changes_assessment',
		'share_summary',
	],
	properties: {
		verdict: { type: 'string', enum: ['ride', 'fly'] },
		confidence: { type: 'string', enum: ['toss-up', 'leans', 'clear'] },
		summary: { type: 'string' },
		reasons: { type: 'array', items: { type: 'string' } },
		worth_considering: { type: 'array', items: { type: 'string' } },
		differs_from_numbers: { type: ['string', 'null'] },
		changes_assessment: { type: ['string', 'null'] },
		share_summary: { type: 'string' },
	},
} as const;
