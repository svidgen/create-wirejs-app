import { html, node, text, hydrate, pendingHydration } from 'wirejs-dom/v2';
import Countdown from '../components/countdown.js';

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

function App() {
	return html`<div id='app'>
		
		<h4>Greeting</h4>
		${node('greeting', Greeting('World'))}
		
		<h4>Countdown</h4>
		${node('countdown', Countdown(5))}

	</div>`;
}

export function generate(path) {
	const page = html`
		<!doctype html>
		<html>
			<head>
				<title>test</title>
			</head>
			<body>
				<p><a href='/ssr-sample.html'>SSR page</a></p>
				${App()}
			</body>
		</html>
	`;

	return page;
}

hydrate('app', App);
