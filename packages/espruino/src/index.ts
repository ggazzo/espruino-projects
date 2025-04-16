import { pins } from './definitions';

import { readTemperature } from './Temperature';
import { createHeatingMachine, create, commandParser } from '@tspruino/application';
import { display, displayMachine, timeseriesGraph, lcd } from './display';
import { encoder } from './encoder';
import { genericMenu } from './menus';
import { ee } from './remote';
import { Menu } from '@tspruino/menu';

I2C1.setup({ sda: pins.sda, scl: pins.scl, bitrate: 400000 });

SPI1.setup({ mosi: pins.mosi, miso: pins.miso, sck: pins.sclk });

E.connectSDCard(SPI1, pins.cs);

const idle = (fn: () => void, timeout: number) => {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	const stop = () => {
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	};

	const reset = () => {
		stop();
		timeoutId = setTimeout(fn, timeout);
	};

	reset();

	return {
		reset,
		stop,
	};
};

const mainMachine = create();
const heatingMachine = createHeatingMachine();

mainMachine.emitter.on('state.enter.idle', () => {
	const file = mainMachine.getContext().file;
	if (file) {
		let line = '';
		let char = file.read(1);
		while (char && char !== '\n') {
			line += char;
			char = file.read(1);
		}
		const command = commandParser(line);

		if (command) {
			mainMachine.send(command);
		}
	}
});

displayMachine.emitter.on('state.enter.idle', () => {
	displayMachine.emitter.once(
		'state.exit.idle',
		encoder.on('press', () => {
			displayMachine.send({ type: 'MENU' });
		}),
	);

	displayMachine.emitter.once(
		'state.exit.idle',
		ee.on('press', () => {
			displayMachine.send({ type: 'MENU' });
		}),
	);
	displayMachine.emitter.once('state.exit.idle', display(timeseriesGraph, lcd));
});

displayMachine.emitter.on('state.enter.menu', () => {
	const menuIdle = idle(() => {
		displayMachine.send({ type: 'DONE' });
	}, 20000);

	displayMachine.emitter.once('state.exit.menu', menuIdle.stop);

	displayMachine.emitter.once(
		'state.exit.menu',
		ee.on('direction', direction => {
			menuIdle.reset();
			genericMenu.move(direction);
		}),
	);

	displayMachine.emitter.once(
		'state.exit.menu',
		ee.on('press', () => {
			menuIdle.reset();
			genericMenu.select();
		}),
	);

	displayMachine.emitter.once(
		'state.exit.menu',
		encoder.on('change', direction => {
			menuIdle.reset();
			genericMenu.move(direction);
		}),
	);

	displayMachine.emitter.once(
		'state.exit.menu',
		encoder.on('press', () => {
			menuIdle.reset();
			genericMenu.select();
		}),
	);

	displayMachine.emitter.once('state.exit.menu', display(genericMenu, lcd));
});

const brewingMenu = new Menu(
	lcd,
	'Brewing Menu',
	{
		Start: {
			text: 'Start Brewing',
			value: false,
			format: value => (value ? 'Running' : 'Stopped'),
		},
		Temperature: {
			text: 'Set Temperature',
			value: 65,
			step: 1,
			min: 0,
			max: 100,
			format: value => `${value}°C`,
		},
		Timer: {
			text: 'Set Timer',
			value: 60,
			step: 1,
			min: 0,
			max: 120,
			format: value => `${value} min`,
		},
		Back: {
			text: 'Back to Main Menu',
			value: false,
		},
	},
);

genericMenu = brewingMenu;

setInterval(() => {
	const { temperature, target } = heatingMachine.getContext();
	timeseriesGraph.add(temperature, target);
}, 1000);

setInterval(() => {
	const temperature = readTemperature();
	heatingMachine.send({
		type: 'READ_TEMPERATURE',
		temperature,
	});
}, 1000);

const data = [50, 0, 0];
setInterval(() => {
	require('neopixel').write(47, data);
	const first = data[0];
	data[0] = data[1];
	data[1] = data[2];
	data[2] = first;
}, 1000);

displayMachine.send({ type: 'START' });
mainMachine.send({ type: 'START' });
