import { Menu, ExtractFromItemToEvents } from '@tspruino/menu';

import { lcd } from './display';

export const genericMenu = new Menu(lcd, 'Inversa', {
	TargetTemperature: {
		text: 'T',
		value: 0,
		min: 0,
		max: 100,
		step: 1,
		format: value => `${value}ºC`,
	},
	preparing_time: {
		text: 'Preparing Time',
		value: 0,
		min: 0,
		max: 100,
		step: 1,
		format: value => new Date(value * 1000).toISOString(),
	},
	skip: {
		text: 'Skip',
		value: true,
		format: value => `${value}`,
	},
	abort: {
		text: 'Abort',
		value: false,
		format: value => `${value}`,
	},
});
