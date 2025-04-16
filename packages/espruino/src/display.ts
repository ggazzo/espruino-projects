import { FiniteStateMachine } from '@tspruino/machine';
import { connectLCD, G } from '@tspruino/ST7565_I2C';
import { multiSeries, timeseries } from './timeseries';
import { encoder } from './encoder';

// export const lcd = connectLCD({
// 	i2c: I2C1,
// });

export const lcd: Graphics = require('SSD1306').connect(
	I2C1,
	() => {
		lcd.clear();
		lcd.drawString('Ready!', 0, 0);
		lcd.flip();
	},
	{
		width: 64,
		height: 48,
	},
);

export const timeseriesGraph = multiSeries(
	[new Float32Array(64), new Float32Array(64)] as const,
	'Temperature',
);

export const display = (
	o: {
		draw: (g: Graphics) => void;
	},
	g: Graphics,
) => {
	const interval = setInterval(() => {
		g.clear();
		o.draw(g);
		g.flip();
	}, 1000);

	return () => clearInterval(interval);
};

export const displayMachine = FiniteStateMachine.create<
	'initial' | 'idle' | 'menu',
	| {
			type: 'MENU';
	  }
	| {
			type: 'START';
	  }
	| {
			type: 'DONE';
	  },
	{
		timer: ReturnType<typeof setInterval> | null;
		cleanup: () => void;
	}
>({
	context: {
		timer: null,
		cleanup: () => {},
	},
	initial: 'initial',
	states: {
		initial: {
			transitions: {
				START: {
					target: 'idle',
				},
			},
		},
		idle: {
			transitions: {
				MENU: {
					target: 'menu',
				},
			},
		},
		menu: {
			transitions: {
				DONE: {
					target: 'idle',
				},
			},
		},
	},
});
