import { AuthenticationService, FileService, withContext } from 'wirejs-services';
import { defaultGreeting } from '../src/lib/sample-lib.js';

const files = new FileService('just-testing');
const authService = new AuthenticationService('core-users');

// need to provide an `withContext` wrapper or an `api({...})` constructor used
// to create all API exports so we can inject context elegantly.

export const auth = withContext(context => ({
	getState: () => {
		console.log('CALL getState');
		return authService.getState(context.cookies);
	},

	/**
	 * 
	 * @param {Parameters<typeof authService.setState>[1]} options 
	 * @returns 
	 */
	setState: (options) => authService.setState(context.cookies, options)
}));

/**
* Given a name, this will return a friendly, personalized greeting.
* @param {string} name
* @returns {Promise<string>} A friendly greeting.
*/
export const hello = withContext(context => async (name) => {
	return `${defaultGreeting()}, ${name}.`;
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
