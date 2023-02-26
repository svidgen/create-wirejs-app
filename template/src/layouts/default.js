// core deps
const wirejs = require('wirejs-dom');
require('highlight.js/styles/github.css');
require('./default.css');

// expose wirejs to inline scripts
Object.assign(window, wirejs);

// common components
require('../components/countdown');
