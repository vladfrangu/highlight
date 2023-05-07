import { inviteOptions } from '#utils/misc';
import { container, SapphireClient } from '@sapphire/framework';

export class HighlightClient extends SapphireClient {
	public override async login(token?: string) {
		container.logger.info('Connecting to the database...');
		await container.prisma.$connect();

		this.logger.info('Starting the workers...');
		await container.highlightManager.start();

		this.logger.info('Logging in to Discord...');
		const loginResult = await super.login(token);

		container.clientInvite = container.client.generateInvite(inviteOptions);

		return loginResult;
	}

	public override async destroy() {
		try {
			await container.prisma.$disconnect();
		} catch {}
		await container.highlightManager.destroy();
		return super.destroy();
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		clientInvite: string;
	}
}
