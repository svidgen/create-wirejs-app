import { html, node, text, hydrate, pendingHydration } from 'wirejs-dom/v2';

/**
 * 
 * @param {string} name 
 * @returns 
 */
function Greeting(name) {
	const self = html`<div id='greeting'>
		Hello, <b onclick=${
			() => self.data.name = self.data.name.toUpperCase()
		}>${text('name', name)}</b>!
	</div>`;

	return self;
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

hydrate('greeting', () => Greeting());

console.log('pending hydration', pendingHydration);