import {
	createHeatingMachine,
	create,
	commandParser,
	createReadMachine,
} from '@tspruino/application';

import { pins } from './definitions';

import { KalmanFilter } from './kalmanFilter';
import { map } from './map';
import { PID } from './pid';
import { Thermistor } from './thermistor';

const pid = new PID(true, 0.1, 0.01, 0.001, 0, 255, 0, 1);
const sensor = new Thermistor(pins.temperature);
const filter = new KalmanFilter(2, 2, 0.01);

const heater = new Pin(pins.heater);

const readTemperature = () => filter.updateEstimate(sensor.getTemp());

const readMachine = createReadMachine();
const mainMachine = create();
const heatingMachine = createHeatingMachine();

Serial1.on(
	'data',
	(() => {
		return (data: string) => {
			let idx = data.indexOf('\n');
			while (idx >= 0) {
				const line = data.substr(0, idx);
				data = data.substr(idx + 1);

				const command = commandParser(line);

				if (!command) {
					idx = data.indexOf('\n');
					return;
				}

				if (command.type === 'OPEN_FILE') {
					readMachine.send(command);
					return;
				}

				mainMachine.send(command);
				idx = data.indexOf('\n');
			}
		};
	})(),
);

mainMachine.emitter.on('state.enter.idle', () => {
	if (readMachine.getState() === 'idle') {
		return;
	}
	readMachine.send({ type: 'READ_LINE' });
});

readMachine.on('state.enter.opening', () => {
	const file = E.openFile('filepath', 'r');
	readMachine.send({ type: 'OK' });

	const stop = readMachine.on('state.enter.reading', () => {
		let line;
		let char = file.read(1);
		while (char && char !== '\n') {
			line += char;
			char = file.read(1);
		}
		readMachine.send({ type: 'OK' });
	});

	readMachine.emitter.once('state.enter.idle', () => {
		stop();
		file.close();
	});
});

heatingMachine.on('state.enter.pid', () => {
	const temperature = readTemperature();

	const now = Date.now();
	const timeElapsed = now - heatingMachine.getContext().lastTimePID;

	heatingMachine.send({
		type: 'DONE',
		output: pid.compute(temperature, timeElapsed),
		lastTimePID: now,
	});
});

mainMachine.emitter.on('context.update.PID', () => {
	const { PID } = mainMachine.getContext();
	pid.setTunings(PID.kp, PID.ki, PID.kd, PID.pOn);
});

heatingMachine.emitter.on('context.update.output', () => {
	const { output } = heatingMachine.getContext();
	heater.pwm(map(output, 0, 255, 0, 1));
});

setInterval(() => {
	const temperature = readTemperature();
	mainMachine.send({
		type: 'READ_TEMPERATURE',
		temperature,
	});
	heatingMachine.send({
		type: 'READ_TEMPERATURE',
		temperature,
	});
}, 100);
