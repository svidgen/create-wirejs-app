const { DomClass } = require('wirejs-dom');
const markup = require('./countdown.tpl');

const Countdown = DomClass(markup, function() {
	this.remainingTime = this.from;
	
	this.tick = () => {
		this.remainingTime = this.remainingTime - 1;

		if (this.remainingTime === 0) {
			this.countdown = "That's it! Time's up!"
		} else {
			setTimeout(() => this.tick, 1000);
		}
	};

	this.tick();	
});

module.exports = Countdown;