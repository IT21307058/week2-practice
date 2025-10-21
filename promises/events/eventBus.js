const { EventEmitter } = require('events');
const eventBus = new EventEmitter();

// (optional) avoid memory-leak warnings if you add many listeners in dev
eventBus.setMaxListeners(25);

module.exports = eventBus;