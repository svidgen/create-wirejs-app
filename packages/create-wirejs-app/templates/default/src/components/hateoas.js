import { html, node } from 'wirejs-dom/v2';

/**
 * @typedef {{
 * 	state: Object;
 * 	actions: Actions;
 * }} State
 * 
 * @typedef {Record<string, Action>} Actions
 * 
 * @typedef {{
 * 	name: string;
 * 	inputs?: InputRecord;
 * 	buttons?: string[]
 * }} Action
 * 
 * @typedef {Record<string, 'string' | 'password' | 'number' | 'boolean'>} InputRecord
 * 
 * @typedef {{
 * 	name: string;
 * 	inputs?: InputRecord;
 * 	verb: string;
 * }} ActionInput
 * 
 * @typedef {Object} StateManager
 * @property {() => Promise<State>} getState
 * @property {(input: ActionInput) => Promise<State>} setState
 */

/**
 * @param {StateManager} stateManager 
 * @returns 
 */
export const hateous = (stateManager) => html`<hateoas>
		${node('state', html`<span>Loading ...</span>`)}
	</hateoas>`.onadd(async (self) => {
		const state = await stateManager.getState();
		self.data.state = html`<span>${JSON.stringify(state.state)}</span>`
	})
;