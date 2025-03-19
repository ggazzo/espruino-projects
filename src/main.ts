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

const heatingMachine = createHeatingMachine();

heatingMachine.on('state.enter.pid', () => {
	const temperature = readTemperature();

	const now = Date.now();
	const timeElapsed = now - heatingMachine.getContext().lastTimePID;

	heatingMachine.send({
		type: 'DONE',
		output: heater.compute(temperature, timeElapsed),
		lastTimePID: now,
	});
});

heatingMachine.on('context.update.output', () => {
	const { output } = heatingMachine.getContext();
	heater.pwm(map(output, 0, 255, 0, 1));
});

setInterval(() => {
	heatingMachine.send({
		type: 'READ_TEMPERATURE',
		temperature: readTemperature(),
	});
}, 100);
