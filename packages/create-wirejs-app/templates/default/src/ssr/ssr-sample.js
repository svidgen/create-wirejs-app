import { html, text, hydrate, pendingHydration } from 'wirejs-dom/v2';
import Countdown from '../components/countdown.js';
import { authenticator } from '../components/authenticator.js';
import { accountMenu } from '../components/account-menu.js';
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
		<div style='float: right;'>${accountMenu(auth)}</div>

		<h4>Greeting from the server</h4>
		${Greeting('World')}
		
		<h4>Countdown</h4>
		${await Countdown(5)}
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
