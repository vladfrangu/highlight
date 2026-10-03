import { setup } from '@skyra/env-utilities';
import { defineConfig, env } from 'prisma/config';

setup({ path: new URL('.env', import.meta.url) });

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: { path: 'prisma/migrations' },
	typedSql: { path: 'prisma/sql' },
	datasource: { url: env('POSTGRES_URL') },
});
