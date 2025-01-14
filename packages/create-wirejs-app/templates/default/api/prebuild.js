import { writeFileSync } from 'fs';
import { requiresContext } from 'wirejs-services';

const indexModule = await import('./index.js');

function apiExportCall(name) {
	const fullname = JSON.stringify([name]);
	return dedent(2, /* js */ `
		export const ${name} = (...args) => wirejsCallApi(${fullname}, ...args);
	`);
};

function dedent(tabs, text) {
	const tabString = new Array(tabs).fill('\t').join('');
	return text.trim().replace(new RegExp(`^${tabString}`, 'gm'), '');
}

function apiMethodCall(name, nesting) {
	const key = JSON.stringify(name);
	const fullname = JSON.stringify([...nesting, name]);
	return dedent(2,  /* js */ `
		${key}: (...args) => wirejsCallApi(${fullname}, ...args),
	`);
};

function buildCallTree(obj, nesting = []) {
	const atRoot = nesting.length === 0;
	const nestingText = Array(nesting.length).fill('\t').join('');
	const output = [];
	for (const [name, item] of Object.entries(obj)) {
		if (requiresContext(item)) {
			const unwrapped = { [name]: item({}) };
			output.push(buildCallTree(unwrapped, [...nesting]));
		} else if (typeof item === 'function') {
			if (atRoot) {
				output.push(apiExportCall(name));
			} else {
				output.push(apiMethodCall(name, nesting));
			}
		} else if (typeof item === 'object') {
			if (atRoot) {
				output.push(`export const ${name} = {`);
				output.push(buildCallTree(item, [...nesting, name]));
				output.push(`};`);
			} else {
				output.push(`${JSON.stringify(name)}: {`);
				output.push(buildCallTree(item, [...nesting, name]));
				output.push(`},`);
			}
		}
	}
	return output.map(o => `${nestingText}${o}`).join('\n');
};

const apiCode = buildCallTree(indexModule);

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