import { hello } from 'my-api';
import { DomClass } from 'wirejs-dom';

console.log('hello', hello('world'));

const markup = `<sample:countdown>
	<h3>Limited time offer!</h3>
	<div data-id='countdown'>
		<b>
			<span data-id='remaining'></span>
			<span data-id='label'>seconds</span>
		</b> left!
	</div>
</sample:countdown>`;

const Countdown = DomClass(markup, function() {
	this.remaining = this.from || 60;
	
	const tick = () => {
		this.remaining = this.remaining - 1;

		if (this.remaining == 1) {
			this.label = 'second';
		} else if (this.remaining == 0) {
			this.countdown = '<b>ALL DONE! <i>You missed it!!!</i></b>';
		}

		if (this.remaining > 0) {
			setTimeout(() => tick(), 1000);
		}
	};

	tick();	
});

export default Countdown;
