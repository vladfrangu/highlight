import { readFile, writeFile } from 'node:fs/promises';

const modules = ['@discordjs/builders', 'discord-api-types'];

const nodeModuleFolderPath = new URL('../node_modules/', import.meta.url);

for (const moduleName of modules) {
	const modulePackageJsonPath = new URL(`./${moduleName}/package.json`, nodeModuleFolderPath);

	const packageJson = JSON.parse(await readFile(modulePackageJsonPath, 'utf8'));

	const { exports } = packageJson;

	if (!exports) {
		console.log(`Skipping ${moduleName} because it doesn't have an exports property`);
		continue;
	}

	for (const [key, value] of Object.entries(exports)) {
		// Top-level exports, like
		/*
		{
			moduleName: '@sapphire/framework',
			exports: {
				import: './dist/index.mjs',
				require: './dist/index.js'
			}
		}
 		*/
		if (['import', 'require'].includes(key)) {
			exports.types = value.replace(/\.(m?js)$/, '.d.ts');
			await writeFile(modulePackageJsonPath, JSON.stringify(packageJson, null, '\t'), 'utf8');
			console.log(`Fixed ${moduleName}'s package.json`);
			break;
		}

		// Mapped exports, like this:
		/*
		{
			moduleName: '@sapphire/plugin-logger',
  			exports: {
    			'.': { import: './dist/index.mjs', require: './dist/index.js' },
    			'./register': { import: './register.mjs', require: './register.js' }
  			}
		}
		*/
		// Value will be { import: 'path', require: 'path' }
		for (const exportValue of Object.values(value)) {
			value.types = exportValue.replace(/\.(m?js)$/, '.d.ts');
		}
	}
	console.log(`Fixed ${moduleName}'s package.json`);
	await writeFile(modulePackageJsonPath, JSON.stringify(packageJson, null, '\t'), 'utf8');
}
