const { DomClass } = require('wirejs-dom');
const markup = require('./countdown.tpl').default;

const { hello } = require('../api/sample');

const Countdown = DomClass(markup, function() {
	this.remaining = this.from || 60 * 60;
	
	const tick = () => {
		this.remaining = this.remaining - 1;

		if (this.remaining == 1) {
			this.label = 'second';
		}

		if (this.remaining == 0) {
			// this.countdown = "<b><i>That's it!</i> Time's up!</b>"
			hello("world").then(r => this.result = r);
		} else {
			setTimeout(() => tick(), 1000);
		}
	};

	tick();	
});

module.exports = Countdown;
