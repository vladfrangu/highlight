export type GuildWorkerType = 'words' | 'regularExpressions';

export interface HighlightResult {
	type: GuildWorkerType;
	results: ParsedHighlightData[];
}

export interface ParsedHighlightData {
	memberID: string;
	parsedContent: string;
}
