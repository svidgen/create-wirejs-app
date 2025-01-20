import { attribute, html, node } from 'wirejs-dom/v2';

/**
 * @typedef {import('wirejs-services').AuthenticationService} AuthenticationService
 * @typedef {ReturnType<AuthenticationService['buildApi']>} AuthStateApi
 * @typedef {Awaited<ReturnType<AuthStateApi['getState']>>} AuthState
 * @typedef {AuthState['actions'][string]} AuthStateAction
 * @typedef {Parameters<AuthStateApi['setState']>[0]} AuthStateActionInput
 */

/**
 * @param {AuthStateAction} action
 * @param {(act: AuthStateActionInput) => void} act
 */
export const authenticatoraction = (action, act) => {
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
		return html`<authenticatoraction>
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
		</authenticatoraction>`;
	} else {
		return html`<authenticatoraction>
			<span>${actors}</span>
		</authenticatoraction>`;
	}
}

/**
 * @param {AuthStateApi} stateManager 
 * @returns 
 */
export const authenticator = (stateManager) => {
	/**
	 * @type {Set<(state: AuthState) => any>}
	 */
	const listeners = new Set();

	/**
	 * @type {AuthState}
	 */
	let lastKnownState = undefined;

	const self = html`<authenticator>
		${node('state', html`<span>Loading ...</span>`)}
	</authenticator>`.extend(self => ({
		/**
		 * @param {AuthState} state 
		 */
		renderState(state) {
			lastKnownState = state;
			if (state.errors) {
				alert(state.errors.map(e => e.message).join("\n\n"));
			} else {
				self.data.state = html`<div>
					<div>${state.message || ''}</div>
					<div>${Object.entries(state.actions).map(([key, action]) => {
						return authenticatoraction({key, ...action}, async act => {
							self.renderState(await stateManager.setState(act));
						});
					})}</div>
				</div>`;
			}
			for (const listener of listeners) {
				try {
					listener(state);
				} catch (error) {
					console.error("Error calling auth state listener.");
				}
			}
		}
	})).onadd(async (self) => {
		self.renderState(await stateManager.getState())
	}).extend(self => ({
		data: {
			/**
			 * @param {(state: AuthState) => any} callback
			 */
			onchange: (callback) => {
				listeners.add(callback);
			},

			/**
			 * @param {(state: AuthState) => any} callback
			 */
			removeonchange: (callback) => {
				listeners.delete(callback);
			},

			get lastKnownState() {
				return lastKnownState;
			}
		}
	}));

	return self;
};