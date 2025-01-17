import { html, text, hydrate, pendingHydration } from 'wirejs-dom/v2';
import Countdown from '../components/countdown.js';
import { hateoas } from '../components/hateoas.js';
import { auth } from 'my-api';

/**
 * 
 * @param {string} name 
 * @returns 
 */
function Greeting(name) {
	const self = html`<div>
		Hello, <b onclick=${
			() => self.data.name = self.data.name.toUpperCase()
		}>${text('name', name)}</b>!
	</div>`;

	return self;
}

async function App() {
	return html`<div id='app'>
		
		<h4>Greeting from the server</h4>
		${Greeting('World')}
		
		<h4>Countdown</h4>
		${await Countdown(5)}

		<h4>HATEOAS</h4>
		${hateoas(auth)}

	</div>`;
}

export async function generate(path) {
	const page = html`
		<!doctype html>
		<html>
			<head>
				<title>test</title>
			</head>
			<body>
				<p><a href='/'>SSG page</a></p>
				${await App()}
			</body>
		</html>
	`;

	return page;
}

hydrate('app', App);
