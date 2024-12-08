import { hello } from 'my-api';
import { html, text, node } from 'wirejs-dom/v2';

// console.log('hello', await hello('world'));

/**
 * Counts down from a given time.
 * 
 * @param {number} from - The time to count down "from".
 * @returns 
 */
export function Countdown(T = 10) {
	return html`<div>
		${node('remaining', T, time => {
			if (time === 0) {
				return html`<div><b>ALL DONE!</b></div>`;
			} else if (time === 1) {
				return html`<div><i>ONE second left!!!</i></div>`;
			} else {
				return html`<div>${time} seconds remaining ...</div>`;
			}
		})}
	</div>`.onadd(self => {
		function tick() {
			self.data.remaining = self.data.remaining - 1;
			if (self.data.remaining > 0) {
				setTimeout(() => tick(), 1000);
			}
		};
		tick();
	});
};

export default Countdown;
