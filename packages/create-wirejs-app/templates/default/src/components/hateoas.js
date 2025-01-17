import { attribute, html, node } from 'wirejs-dom/v2';

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
 * 	key: string;
 * 	inputs?: InputRecord;
 * 	verb: string;
 * }} ActionInput
 * 
 * @typedef {Object} StateManager
 * @property {() => Promise<State>} getState
 * @property {(input: ActionInput) => Promise<State>} setState
 */

/**
 * @param {Action} action
 */
export const hateoasAction = (action, act) => {
	const inputs = Object.entries(action.inputs || []).map(([name, type]) => {
		const input = html`<div>
			<label>${name}</label>
			<input name=${name} type=${type} value=${attribute('value', '')} />
		</div>`.extend(self => ({
			data: { name }
		}));
		return input;
	});

	const buttons = action.buttons?.map(b => html`
		<button type='submit' value='${b}'>${b}</button>`
	);
	const link = buttons ? undefined : [
		html`<a
			style='cursor: pointer;'
			onclick=${() => act({ key: action.key })}
		>${action.name}</a>`
	];
	const actors = link ?? buttons;

	if (action.inputs && Object.keys(action.inputs).length > 0) {
		return html`<hateoasaction>
			<div>
				<h4>${action.name}</h4>
				<form onsubmit=${evt => {
					evt.preventDefault();
					act({
						key: action.key,
						verb: evt.submitter?.value,
						inputs: Object.fromEntries(inputs.map(input => ([
							input.data.name,
							input.data.value
						])))
					});
				}}>
					${inputs}
					${actors}
				</form>
			</div>
		</hateoasaction>`;
	} else {
		return html`<hateoasaction>
			<span>${actors}</span>
		</hateoasaction>`;
	}
}

/**
 * @param {StateManager} stateManager 
 * @returns 
 */
export const hateoas = (stateManager) => html`<hateoas>
		${node('state', html`<span>Loading ...</span>`)}
	</hateoas>`.extend(self => {
		return {
			renderState(state) {
				self.data.state = html`<div>
					<div>state: ${JSON.stringify(state.state)}</div>
					<div>actions: ${Object.entries(state.actions).map(([key, action]) => {
						return hateoasAction({key, ...action}, async act => {
							console.log(act, self.getState);
							self.renderState(await stateManager.setState(act));
						})
					})}</div>
				</div>`;
			},
		}
	}).onadd(async (self) => {
		self.renderState(await stateManager.getState())
	})
;