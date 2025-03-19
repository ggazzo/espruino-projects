import { pins } from './definitions';
import { createHeatingMachine } from './heating.machine';
import { KalmanFilter } from './kalmanFilter';
import { map } from './map';
import { PID } from './pid';
import { Thermistor } from './thermistor';

const pid = new PID(true, 0.1, 0.01, 0.001, 0, 255, 0, 1);
const sensor = new Thermistor(pins.temperature);
const filter = new KalmanFilter(2, 2, 0.01);

const heater = new Pin(pins.heater);

const readTemperature = () => filter.updateEstimate(sensor.getTemp());

let lastElapsed = 0;

// actor.subscribe(state => {
// 	switch (true) {
// 		case state.matches('pid'): {
// 			const now = Date.now();
// 			const temperature = readTemperature();
// 			const output = pid.compute(temperature, (now - lastElapsed) / 1000);
// 			actor.send({ type: 'DONE', output });
// 			lastElapsed = now;
// 		}
// 		case state.matches('heating'): {
// 			heater.pwm(map(state.context.output, 0, 255, 0, 1));
// 		}
// 		case state.matches('normal'): {
// 			heater.pwm(0);
// 		}
// 	}
// });

const heatingMachine = createHeatingMachine();

heatingMachine.on('stateChange', ({ previousState, currentState, event }) => {
	console.log('stateChange', previousState, currentState, event);
});

setInterval(() => {
	console.log(
		'AAAAA',
		heatingMachine.send({
			type: 'READ_TEMPERATURE',
			temperature: Math.random() * 100,
			// readTemperature()
		}),
	);
}, 100);
