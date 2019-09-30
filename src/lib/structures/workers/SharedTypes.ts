export type WorkerType = 'wordWorker' | 'regularExpressionWorker';

export type MessageType = 'ready' | 'deleteInvalid' | 'validationResult';

export interface ReceivedMessage {
	event: MessageType;
	data: any;
}

export interface DeleteInvalidMessage extends ReceivedMessage {
	event: 'deleteInvalid';
	data: {
		guildID: string;
		memberID: string;
		type: 'words' | 'regularExpressions';
		value: string;
	};
}

export interface ReadyMessage extends Omit<ReceivedMessage, 'data'> {
	event: 'ready';
}

export interface ValidatedMessage extends ReceivedMessage {
	event: 'validationResult';
	data: {
		input: string;
		valid: boolean;
	};
}

export interface WorkerData {
	type: WorkerType;
	botToken: string;
}
