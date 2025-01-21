import { html, text, hydrate, node, list, attribute } from 'wirejs-dom/v2';
import { accountMenu } from '../components/account-menu.js';
import { auth, todos } from 'my-api';

function Todos() {
	const self = html`<div>
		<h4>Your Todos</h4>
		<ol>${list('todos', todo => html`<li>${todo}</li>`)}</ol>
		<div>
			<form onsubmit=${event => {
				event.preventDefault();
				self.data.todos.push(self.data.newTodo);
				self.data.newTodo = '';
				todos.write(self.data.todos);
			}}>
				<input type='text' value=${attribute('newTodo', '')} />
				<input type='submit' value='Add' />
			</form>
		</div>
	<div>`.onadd(async self => {
		self.data.todos = await todos.read();
	});
	return self;
}

async function App() {
	const accountMenuNode = accountMenu(auth);

	accountMenuNode.data.onchange(async state => {
		if (state.state.user) {
			self.data.content = Todos();
		} else {
			self.data.content = html`<div>You need to sign in to add your todo list.</div>`;
		}
	});

	const self = html`<div id='app'>
		<div style='float: right;'>${node('auth', () => accountMenuNode)}</div>
		${node('content', html`<div>Loading ...</div>`)}
	</div>`;

	return self;
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
