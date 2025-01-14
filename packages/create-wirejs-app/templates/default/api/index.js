// import { AuthenticationService, FileService, withContext } from 'wirejs-services';
import { withContext } from 'wirejs-services';
import { defaultGreeting } from '../src/lib/sample-lib.js';

// const files = new FileService({ id: 'just-testing' });
// const authService = new AuthenticationService({ id: 'users'});

// need to provide an `withContext` wrapper or an `api({...})` constructor used
// to create all API exports so we can inject context elegantly.

// export const auth = withContext(context => ({
// 	getState: authService.getState
// }));

/**
* Given a name, this will return a friendly, personalized greeting.
* @param {string} name
* @returns {Promise<string>} A friendly greeting.
*/
export const hello = withContext(ctx => async (name) => {
	ctx.cookies.set({ name: 'test-cookie', value: 'test-value' });
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