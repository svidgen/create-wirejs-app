import { defaultGreeting } from '../src/lib/sample-lib.js';

/**
* Given a name, this will return a friendly, personalized greeting.
* @param {string} name
* @returns {string} A friendly greeting.
*/
export const hello = async (name) => `${defaultGreeting()}, ${name}.`;