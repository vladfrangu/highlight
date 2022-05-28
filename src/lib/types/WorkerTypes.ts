import type { Member } from '@prisma/client';

export enum WorkerType {
	Word,
	RegularExpression,
}

export interface HighlightResult {
	type: WorkerType;
	results: ParsedHighlightData[];
	memberIds: string[];
}

export interface ParsedHighlightData {
	memberId: string;
	parsedContent: string;
	trigger: string;
}

export interface WorkerData {
	type: WorkerType;
}

// #region Worker Commands
export const enum WorkerCommands {
	HandleHighlight,
	RemoveTriggerForUser,
	UpdateCacheForGuild,
	UpdateFullCache,
	ValidateRegularExpression,
}

export type WorkerCommandsUnion =
	| HandleHighlightCommand
	| RemoveTriggerForUserCommand
	| UpdateCacheForGuildCommand
	| UpdateFullCacheCommand
	| ValidateRegularExpressionCommand;

export type HandleHighlightCommand = BaseCommand<
	WorkerCommands.HandleHighlight,
	{
		content: string;
		authorId: string;
		guildId: string;
		messageId: string;
	}
>;

export type RemoveTriggerForUserCommand = BaseCommand<
	WorkerCommands.RemoveTriggerForUser,
	{
		guildId: string;
		memberId: string;
		trigger: string;
	}
>;

export type UpdateCacheForGuildCommand = BaseCommand<
	WorkerCommands.UpdateCacheForGuild,
	{ guildId: string; members: Member[] }
>;

export type UpdateFullCacheCommand = BaseCommand<WorkerCommands.UpdateFullCache, { members: Member[] }>;

export type ValidateRegularExpressionCommand = BaseCommand<
	WorkerCommands.ValidateRegularExpression,
	{ regularExpression: string }
>;
// #endregion

// #region Worker Responses
export const enum WorkerResponseTypes {
	DeleteInvalidRegularExpression,
	HighlightResult,
	Ready,
	ValidateRegularExpressionResult,
}

export type WorkerResponse =
	| DeleteInvalidRegularExpressionResponse
	| HighlightResultResponse
	| ReadyResponse
	| ValidateRegularExpressionResultResponse;

export type DeleteInvalidRegularExpressionResponse = BaseResponse<
	WorkerResponseTypes.DeleteInvalidRegularExpression,
	{ guildId: string; memberId: string; value: string }
>;

export type HighlightResultResponse = BaseResponse<
	WorkerResponseTypes.HighlightResult,
	{
		messageId: string;
		result: HighlightResult;
	}
>;

export type ReadyResponse = BaseResponse<WorkerResponseTypes.Ready, { ready: true }>;

export type ValidateRegularExpressionResultResponse = BaseResponse<
	WorkerResponseTypes.ValidateRegularExpressionResult,
	{ input: string; valid: boolean }
>;
// #endregion

interface BaseCommand<C extends WorkerCommands, D> {
	command: C;
	data: D;
}

interface BaseResponse<C extends WorkerResponseTypes, D> {
	command: C;
	data: D;
}
