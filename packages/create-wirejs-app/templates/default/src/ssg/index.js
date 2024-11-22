import { html, node } from 'wirejs-dom/v2';

/**
 * 
 * @param {string} name 
 * @returns 
 */
function Greeting(name) {
	return html`<div>Hello, <b>${name}</b>!</div>`;
}

export function generate(path) {
	const page = html`
		<!doctype html>
		<html>
			<head>
				<title>test</title>
			</head>
			<body>
				this is a test
				${node('greeting', Greeting('Jon'))}
			</body>
		</html>
	`;

	page.data.greeting = Greeting('World');

	return page;
}