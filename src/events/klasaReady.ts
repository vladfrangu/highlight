import { Event } from 'klasa';
import { initClean } from '@klasa/utils';

export default class extends Event {
	once = true;

	async run() {
		initClean(this.client.token!);
		if (process.argv.includes('--migrate-2.0') && !this.client.settings!.get('migrated')) {
			const provider = this.client.providers.default;
			const docs: any[] = await provider.getAll('members');
			for (const doc of docs) {
				if ('regexes' in doc) {
					doc.regularExpressions = [...doc.regexes];
					delete doc.regexes;
				}
				const blacklistedUsersPresent = 'blacklistedUsers' in doc;
				const blacklistedChannelsPresent = 'blacklistedChannels' in doc;
				if (blacklistedUsersPresent || blacklistedChannelsPresent) {
					doc.blacklist = {};
					if (blacklistedUsersPresent) {
						doc.blacklist.users = [...doc.blacklistedUsers];
						delete doc.blacklistedUsers;
					}
					if (blacklistedChannelsPresent) {
						doc.blacklist.channels = [...doc.blacklistedChannels];
						delete doc.blacklistedChannels;
					}
				}
				await provider.replace('members', doc.id, doc);
			}
			await this.client.settings!.update('migrated', true);
			this.client.console.warn('Migration Done. Process will now exit. Remove the `--migrate-2.0` flag');
			this.client.destroy();
			process.exit(0);
		}

		if (!this.client.schedule.tasks.some((task) => task.taskName === 'cleanup'))
			await this.client.schedule.create('cleanup', '*/10 * * * *', { catchUp: true, id: 'cleanup' });


		for (const guild of this.client.guilds.values()) {
			for (const member of guild.members.values()) {
				const words = member.settings.get('words') as string[];
				const regularExpressions = member.settings.get('regularExpressions') as string[];
				if (words.length) guild.addWords(words, member.user.id);
				if (regularExpressions.length) guild.addRegularExpressions(regularExpressions, member.user.id);
			}
		}
	}
}
