import { AuthenticationService, FileService, withContext } from 'wirejs-services';
import { defaultGreeting } from '../src/lib/sample-lib.js';

const files = new FileService('just-testing');
const authService = new AuthenticationService('core-users');

export const auth = authService.buildApi();

/**
* Given a name, this will return a friendly, personalized greeting.
* @param {string} name
* @returns {Promise<string>} A friendly greeting.
*/
export const hello = withContext(context => async (name) => {
	const { user } = await authService.getBaseState(context.cookies);
	return `${defaultGreeting()}, ${user ? `<b>${user}</b>` : '<i>Anonymous</i>'}.`;
});

// export const addTodo = async (todo) => {
// 	files.write('')
// };

export const widgetFactory = withContext(context => ({
	create: async (id) => ({ type: 'widget', id }),
	nested: {
		create: async (id) => ({ type: 'nestedWidget', id })
	}
}));
