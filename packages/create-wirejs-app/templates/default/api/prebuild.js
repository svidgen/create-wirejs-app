import { writeFileSync } from 'fs';

const indexModule = await import('./index.js');

function apiExportCall(name) {
	return dedent(2, /* js */ `
		export const ${name} = (...args) => wirejsCallApi("${name}", ...args);
	`);
};

function dedent(tabs, text) {
	const tabString = new Array(tabs).fill('\t').join('');
	return text.trim().replace(new RegExp(`^${tabString}`, 'gm'), '');
}

function apiMethodCall(name) {
	return dedent(2,  /* js */ `
		"${name}": async (...args) => wirejsCallApi("${name}", ...args),
	`);
};

function buildCallTree(obj, atRoot = true) {
	const output = [];
	for (const [name, item] of obj) {
		if (typeof item === 'function') {
			if (atRoot) {
				output.push(apiExportCall(name));
			} else {
				output.push(apiMethodCall(name));
			}
		} else if (typeof item === 'object') {
			if (atRoot) {
				output.push(`export const ${name} = { ${buildCallTree(item, false)} }`);
			} else {
				output.push(`"${name}": { ${buildCallTree(item, false)} },`);
			}
		}
	}
	return output.join('\n');
};

const apiCode = buildCallTree(Object.entries(indexModule));

const baseClient = dedent(1, /* js */ `
	async function wirejsCallApi(method, ...args) {
		const response = await fetch("/api", {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify([{method, args:[...args]}])
		});
		const body = await response.json();
		const value = body[0].data;
		return value;
	};
`);

writeFileSync('index.client.js', [baseClient, apiCode].join('\n\n'));