const { DomClass } = require('wirejs-dom');
const markup = require('./countdown.tpl').default;

// Yes, we just import our API's like regular modules.
// Our special API handling wraps them up for us.
const { hello } = require('../api/sample');

const Countdown = DomClass(markup, function() {
	this.remaining = this.from || 60 * 60;
	
	const tick = () => {
		this.remaining = this.remaining - 1;

		if (this.remaining == 1) {
			this.label = 'second';
		}

		if (this.remaining == 0) {
			hello("world").then(r => this.countdown = r);
		} else {
			setTimeout(() => tick(), 1000);
		}
	};

	tick();	
});

module.exports = Countdown;
