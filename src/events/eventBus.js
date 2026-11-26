const { EventEmitter } = require("node:events");

// EventEmitter.emit jest synchroniczny: wyjątek w listenerze trafiłby do service, a odrzucony
// Promise listenera async skończyłby się unhandled rejection. Dlatego każdy handler uruchamiamy
// asynchronicznie i łapiemy jego błędy - błąd listenera nie wpływa na odpowiedź API.
function createEventBus({ onError = (eventName, err) => console.error(`[event:${eventName}] handler failed`, err) } = {}) {
  const emitter = new EventEmitter();

  return {
    publish(eventName, payload) {
      emitter.emit(eventName, { name: eventName, occurredAt: new Date().toISOString(), payload });
    },
    subscribe(eventName, handler) {
      emitter.on(eventName, event => {
        Promise.resolve()
          .then(() => handler(event))
          .catch(err => onError(eventName, err));
      });
    }
  };
}

// null object - używany, gdy nikt nie przekaże event busa (np. w testach integracyjnych)
const noopEventBus = { publish() {}, subscribe() {} };

module.exports = { createEventBus, noopEventBus };
