import { GuildWorkerType, HighlightResult } from './Misc';

export const enum NormalizedWorkerTypes {
	WordWorker = 'Word Worker',
	RegexWorker = 'Regular Expression Worker',
}

export const enum NormalizedGuildType {
	Words = 'words',
	Regexes = 'regexes',
}

export const enum WorkerTypes {
	Word = 'wordWorker',
	Regex = 'regexWorker',
}

// #region Payloads
export type ReceivedWorkerPayload = ReadyPayload | ValidateResult | DeleteInvalidRegex | HighlightParse;

interface BasePayload {
	event: string;
	data?: unknown;
}

interface ReadyPayload extends BasePayload {
	event: 'ready';
}

interface ValidateResult extends BasePayload {
	event: 'validateResult';
	data: {
		input: string;
		valid: boolean;
	};
}

interface DeleteInvalidRegex extends BasePayload {
	event: 'deleteInvalidRegex';
	data: {
		guildID: string;
		memberID: string;
		value: string;
	};
}

interface HighlightParse extends BasePayload {
	event: 'highlightResult';
	data: {
		messageID: string;
		result: HighlightResult;
	};
}
// #endregion

// #region Sent Payloads
export type SentWorkerPayload = ValidateRegex | HandleHighlight | UpdateCache | Eval;

interface ValidateRegex extends BasePayload {
	event: 'validateRegex';
	data: {
		regex: string;
	};
}

interface HandleHighlight extends BasePayload {
	event: 'handleHighlight';
	data: {
		content: string;
		authorID: string;
		guildID: string;
		messageID: string;
		type: GuildWorkerType;
	};
}

interface UpdateCache extends BasePayload {
	event: 'updateCache';
	data: {
		guildID: string;
		entries: Map<string, Set<string>>;
	};
}

interface Eval extends BasePayload {
	event: 'eval';
	data: string;
}
// #endregion

export interface WorkerData {
	type: WorkerTypes;
}
