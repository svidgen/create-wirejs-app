import { attribute, html, node, text, id } from 'wirejs-dom/v2';
import { authenticator } from './authenticator.js';
import type {
	AuthenticationApi,
	AuthenticationMachineState,
} from 'wirejs-resources';

type Callback = (state: AuthenticationMachineState) => any;

export const accountMenu = ({ api, initialState }: {
	api: AuthenticationApi,
	initialState?: AuthenticationMachineState
}) => {
	const uiState = {
		expanded: false
	};

	const listeners = new Set<Callback>();

	const listenForClose = (
		event: (MouseEvent | KeyboardEvent)
	) => {
		if (
			(event.type === 'click' && !self.data.menu.contains(event.target as any))
			|| (event.type === 'keyup' && (event as any).key === 'Escape')
		) {
			close()
		}
	};

	const close = () => {
		uiState.expanded = false;
		updateStyleToMatchState();
		document.removeEventListener('click', listenForClose);
		document.removeEventListener('keyup', listenForClose);
	};

	const removeListenForClose = () => {
		document.removeEventListener('click', listenForClose);
		document.removeEventListener('keyup', listenForClose);
	};

	const updateStyleToMatchState = () => {
		self.data.menu.style.display = uiState.expanded ? '' : 'none';
		const position = self.getBoundingClientRect();
		self.data.menu.style.top = `${position.bottom + 1}px`;
		self.data.menu.style.right = `${document.body.clientWidth - position.right + 16}px`;
	};

	const authenticatorNode = authenticator(api, initialState);
	authenticatorNode.data.onchange(state => {
		self.data.user = state.user?.username || '';
		close();
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
		>${node(
			'user',
			initialState?.user?.username || '',
			name => name ? html`<b>${name}</b>` : html`<i>Anonymous</i>`)}</div>
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
					authenticatorNode.data.focus();
					setTimeout(() => {
						document.addEventListener('click', listenForClose);
						document.addEventListener('keyup', listenForClose);
					}, 1);
				} else {
					removeListenForClose()
				}
			}}
		>☰</div>
		<div ${id('menu', HTMLDivElement)} style='
			display: none;
			position: absolute;
			border: 1px solid gray;
			border-radius: 0.25rem;
			background-color: white;
			padding: 0.5rem;
			box-shadow: -0.125rem 0.125rem 0.25rem lightgray;
		'>${node('authenticator', authenticatorNode)}</div>
	</accountmenu>`.onadd(async self => {
		if (!initialState) {
			const state = await api.getState(null);
			authenticatorNode.data.setState(state);
			self.data.user = state.user?.username || '';
		}
	}).extend(self => ({
		data: {
			onchange: (callback: Callback) => {
				listeners.add(callback);
			},

			removeonchange: (callback: Callback) => {
				listeners.delete(callback);
			},
		}
	}));

	return self;
};