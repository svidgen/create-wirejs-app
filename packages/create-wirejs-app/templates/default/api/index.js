import { AuthenticationService, FileService, withContext } from 'wirejs-services';
import { defaultGreeting } from '../src/lib/sample-lib.js';

const userTodos = new FileService('userTodoApp');
const authService = new AuthenticationService('core-users');

export const auth = authService.buildApi();

async function currentUser(context) {
	const { user } = await authService.getBaseState(context.cookies);
	return user;
}

/**
* Given a name, this will return a friendly, personalized greeting.
* @param {string} name
* @returns {Promise<string>} A friendly greeting.
*/
export const hello = withContext(context => async (name) => {
	const user = await currentUser();
	return `${defaultGreeting()}, ${user ? `<b>${user}</b>` : '<i>Anonymous</i>'}.`;
});

export const todos = withContext(context => ({
	async read() {
		const user = await currentUser(context);

		console.log('current user', user);

		if (!user) {
			throw new Error("Unauthorized");
		}

		try {
			const todos = await userTodos.read(`${user}/todos.json`);
			return todos ? JSON.parse(todos) : [];
		} catch (error) {
			return [];
		}
	},
	/**
	 * @param {string[]} todos 
	 */
	async write(todos) {
		const user = await currentUser(context);

		if (!user) {
			throw new Error("Unauthorized");
		}

		if (!Array.isArray(todos) || !todos.every(todo => typeof todo === 'string')) {
			throw new Error("Invalid todos!");
		}

		console.log({ user, todos });

		await userTodos.write(`${user}/todos.json`, JSON.stringify(todos));
		return true;
	}
}));
