interface FakeClient {
	token: string;
	options: {
		restSweepInterval: number;
	};
	setInterval(...args: any[]): NodeJS.Timeout;
	emit(event: string, message: string): void;
	listenerCount(event: string): 0;
}

export default class RestManager {
	constructor(client: FakeClient);
	readonly api: any;
}
