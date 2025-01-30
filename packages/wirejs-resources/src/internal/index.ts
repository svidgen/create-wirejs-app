import process from 'process';
import fs from 'fs';
import path from 'path';

export async function prebuildApi() {
	const CWD = process.cwd();
	let API_URL = '/api';

	const indexModule = await import(path.join(CWD, 'index.js'));

	try {
		const backendConfigModule = await import(path.join(CWD, 'config.js'));
		const backendConfig = backendConfigModule.default;
		console.log("backend config found", backendConfig);
		if (backendConfig.apiUrl) {
			API_URL = backendConfig.apiUrl;
		}
	} catch {
		console.log("No backend API config found.");
	}

	const apiCode = Object.keys(indexModule)
		.map(k => `export const ${k} = apiTree(INTERNAL_API_URL, ${JSON.stringify([k])});`)
		.join('\n')
	;

	const baseClient = [
		`import { apiTree } from "wirejs-resources/client";`,
		`const INTERNAL_API_URL = ${JSON.stringify(API_URL)};`,
	].join('\n');

	await fs.promises.writeFile(
		path.join(CWD, 'index.client.js'),
		[baseClient, apiCode].join('\n\n')
	);
}