import { html } from 'wirejs-dom/v2';

/**
 * 
 * @param {string} name 
 * @returns 
 */
function Greeting(name) {
	return html`<div>Hello, <b>${name}</b></div>`;
}

export function generate(path) {
	return html`
	<!doctype html>
	<html>
		<head>
			<title>test</title>
		</head>
		<body>
			this is a test
			${Greeting('Jon')}
		</body>
	</html>`;
}