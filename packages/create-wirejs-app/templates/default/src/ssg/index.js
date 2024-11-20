import { html } from 'wirejs-dom/v2';

/**
 * 
 * @param {string} name 
 * @returns 
 */
function Greeting(name) {
	return html`<div>Hello, <b>${name}</b></div>`;
}

// currently broken due to JSDOM XML mode (it seems).
// doesn't work in HTML mode, presumably because wirejs-dom tries to create
// the tree under a `div`, and the `html` node and other div-child invalid nodes
// disappear. we might be able to fix this by having wirejs-dom use an `html` tag
// instead of a div to contain/construct. the only caveat there is that the outer
// `html` tag will still go missing.
//
// staying on XML mode doesn't seem like a good option, because customers will
// not be expecting the strict parsing limitations that come with that.
export function generate(path) {
	return html`<html>
		<head>
			<title>test</title>
		</head>
		<body>
			this is a test
			${Greeting('Jon')}
		</body>
	</html>`;
}