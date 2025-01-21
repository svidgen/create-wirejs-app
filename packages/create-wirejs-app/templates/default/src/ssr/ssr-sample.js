import { html, text, hydrate, node, list, attribute } from 'wirejs-dom/v2';
import { accountMenu } from '../components/account-menu.js';
import { auth, todos } from 'my-api';

async function App() {
	return html`<div id='app'>
		This is generated dynamically on the server at runtime.
	</div>`;
}

export async function generate(path) {
	const page = html`
		<!doctype html>
		<html>
			<head>
				<title>SSR Sample</title>
			</head>
			<body>
				<p><a href='/'>Home</a></p>
				<h1>SSR Sample</h1>
				${await App()}
			</body>
		</html>
	`;

	return page;
}

hydrate('app', App);
