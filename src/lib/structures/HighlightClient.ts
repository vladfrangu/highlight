import { container, SapphireClient } from '@sapphire/framework';

export class HighlightClient extends SapphireClient {
	public override fetchPrefix = () => 'h.';

	public override async login(token?: string) {
		container.logger.info('Connecting to the database...');
		await container.prisma.$connect();

		this.logger.info('Starting the workers...');
		await container.highlightManager.start();

		this.logger.info('Logging in to Discord...');
		return super.login(token);
	}

	public override async destroy() {
		try {
			await container.prisma.$disconnect();
		} catch {}
		void container.highlightManager.destroy();
		return super.destroy();
	}
}
