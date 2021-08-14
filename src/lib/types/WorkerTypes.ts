import type { Members } from '@prisma/client';
import type { WorkerType } from '../structures/HighlightManager';

export interface HighlightResult {
	type: WorkerType;
	results: ParsedHighlightData[];
}

export interface ParsedHighlightData {
	memberID: string;
	parsedContent: string;
	trigger: string;
}

export interface WorkerData {
	type: WorkerType;
}

// #region Worker Commands
export const enum WorkerCommands {
	HandleHighlight = 'handleHighlight',
	RemoveTriggerForUser = 'removeTriggerForUser',
	UpdateCacheForGuild = 'updateCacheForGuild',
	UpdateFullCache = 'updateFullCache',
	ValidateRegularExpression = 'validateRegularExpression',
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
		authorID: string;
		guildID: string;
		messageID: string;
	}
>;

export type RemoveTriggerForUserCommand = BaseCommand<
	WorkerCommands.RemoveTriggerForUser,
	{
		guildID: string;
		memberID: string;
		trigger: string;
	}
>;

export type UpdateCacheForGuildCommand = BaseCommand<
	WorkerCommands.UpdateCacheForGuild,
	{ guildID: string; members: Members[] }
>;

export type UpdateFullCacheCommand = BaseCommand<WorkerCommands.UpdateFullCache, { members: Members[] }>;

export type ValidateRegularExpressionCommand = BaseCommand<
	WorkerCommands.ValidateRegularExpression,
	{ regularExpression: string }
>;
// #endregion

// #region Worker Responses
export const enum WorkerResponseTypes {
	DeleteInvalidRegularExpression = 'deleteInvalidRegularExpression',
	HighlightResult = 'highlightResult',
	Ready = 'ready',
	ValidateRegularExpressionResult = 'validateRegularExpressionResult',
}

export type WorkerResponse =
	| DeleteInvalidRegularExpressionResponse
	| HighlightResultResponse
	| ReadyResponse
	| ValidateRegularExpressionResultResponse;

export type DeleteInvalidRegularExpressionResponse = BaseResponse<
	WorkerResponseTypes.DeleteInvalidRegularExpression,
	{ guildID: string; memberID: string; value: string }
>;

export type HighlightResultResponse = BaseResponse<
	WorkerResponseTypes.HighlightResult,
	{
		messageID: string;
		result: HighlightResult;
	}
>;

export type ReadyResponse = BaseResponse<WorkerResponseTypes.Ready, { ready: true }>;

export type ValidateRegularExpressionResultResponse = BaseResponse<
	WorkerResponseTypes.ValidateRegularExpressionResult,
	{ input: string; valid: boolean }
>;
// #endregion

interface BaseCommand<C extends WorkerCommands, D extends unknown> {
	command: C;
	data: D;
}

interface BaseResponse<C extends WorkerResponseTypes, D extends unknown> {
	command: C;
	data: D;
}
