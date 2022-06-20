const { defaultGreeting } = require('../lib/sample-lib');

module.exports = {
	/**
	 * Given a name, this will return a friendly, personalized greeting.
	 * @param {string} name
	 * @returns {string} A friendly greeting.
	 */
	hello: async (name) => `${defaultGreeting()}, ${name}.`
};
