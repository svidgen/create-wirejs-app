import { attribute, html, node, text, id } from 'wirejs-dom/v2';
import { authenticator } from './authenticator.js';

/**
 * @typedef {import('wirejs-services').AuthenticationService} AuthenticationService
 * @typedef {ReturnType<AuthenticationService['buildApi']>} AuthStateApi
 * @typedef {Awaited<ReturnType<AuthStateApi['getState']>>} AuthState
 * @typedef {AuthState['actions'][string]} AuthStateAction
 * @typedef {Parameters<AuthStateApi['setState']>[0]} AuthStateActionInput
 */

/**
 * @param {AuthStateApi} api
 */
export const accountMenu = (api) => {
	const uiState = {
		expanded: false
	};

	/**
	 * @type {Set<(state: AuthState) => any>}
	 */
	const listeners = new Set();

	const listenForClose = event => {
		if (!self.data.menu.contains(event.target)) {
			uiState.expanded = false;
			updateStyleToMatchState();
			document.removeEventListener('click', listenForClose);
		}
	};

	const updateStyleToMatchState = () => {
		self.data.menu.style.display = uiState.expanded ? '' : 'none';
		const position = self.getBoundingClientRect();
		console.log({position});
		self.data.menu.style.top = `${position.bottom + 1}px`;
		self.data.menu.style.right = `${document.body.clientWidth - position.right + 16}px`;
	};

	const authenticatorNode = authenticator(api);
	authenticatorNode.data.onchange(state => {
		self.data.user = state.state.user || '';
		for (const listener of listeners) {
			try {
				listener(state);
			} catch (error) {
				console.error("Error calling auth state listener.");
			}
		}
	});

	const self = html`<accountmenu style='display: inline-block;'>
		<div
			style='display: inline-block;'
		>${node('user', name => name ? html`<b>${name}</b>` : html`<i>Anonymous</i>`)}</div>
		<div style='
				display: inline-block;
				border: 1px solid silver;
				border-radius: 0.25rem;
				cursor: pointer;
				padding: 0 0.25em;
			'
			onclick=${() => {
				uiState.expanded = !uiState.expanded;
				updateStyleToMatchState();
				if (uiState.expanded) {
					setTimeout(() => document.addEventListener('click', listenForClose), 1);
				} else {
					document.removeEventListener('click', listenForClose);
				}
			}}
		>☰</div>
		<div ${id('menu')} style='
			display: none;
			position: absolute;
			border: 1px solid silver;
			border-radius: 0.5rem;
			padding: 0.5rem;
		'>${node('authenticator', authenticatorNode)}</div>
	</accountmenu>`.onadd(async self => {
		const state = await api.getState();
		self.data.user = state.state.user || '';
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
		}
	}));

	return self;
};