import { pid } from 'process';
import { FiniteStateMachine, calculateHeatingTimeSeconds } from '@tspruino/machine';

type States = 'idle' | 'preparing' | 'confirm' | 'timer' | 'heating' | 'done';
type Events =
	| {
			type: 'STOP';
	  }
	| {
			type: 'ENTER_CONFIRM';
	  }
	| {
			type: 'TEMPERATURE';
			temperature: number;
	  }
	| {
			type: 'READ_TEMPERATURE';
			temperature: number;
	  }
	| {
			type: 'HYSTERESIS_TEMP';
			temperature: number;
	  }
	| {
			type: 'VOLUME';
			volume: number;
	  }
	| {
			type: 'WAIT_TEMPERATURE';
			temperature: number;
	  }
	| {
			type: 'HYSTERESIS_TIME';
			time: number;
	  }
	| {
			type: 'PID';
			kp: number;
			ki: number;
			kd: number;
			pOn: number;
	  }
	| {
			type: 'WATTS';
			watts: number;
	  }
	| {
			type: 'PREPARE_ABSOLUTE_TIME';
			preparing_time: number;
	  }
	| { type: 'CONFIRM' }
	| { type: 'OPEN_FILE' };

export const create = () =>
	FiniteStateMachine.create<
		States,
		Events,
		{
			PID: {
				kp: number;
				ki: number;
				kd: number;
				pOn: number;
			};
			currentTemperature: number;
			targetTemperature: number;
			hysteresisTemp: number;
			hysteresisTime: number;
			volume: number;
			watts: number;
			preparing_time: number;
		}
	>({
		initial: 'idle',
		context: {
			PID: {
				kp: 0.1,
				ki: 0.01,
				kd: 0.001,
				pOn: 0,
			},
			currentTemperature: 0,
			targetTemperature: 0,
			hysteresisTemp: 0,
			hysteresisTime: 0,
			volume: 0,
			watts: 0,
			preparing_time: 0,
		},
		states: {
			idle: {
				transitions: {
					STOP: {
						target: 'done',
					},
					ENTER_CONFIRM: {
						target: 'confirm',
					},
					TEMPERATURE: {
						target: 'idle',
						actions: (context, event) => {
							context.targetTemperature = event.temperature;
						},
					},
					VOLUME: {
						target: 'idle',
						actions: (context, event) => {
							context.volume = event.volume;
						},
					},
					HYSTERESIS_TEMP: {
						target: 'idle',
						actions: (context, event) => {
							context.hysteresisTemp = event.temperature;
						},
					},
					HYSTERESIS_TIME: {
						target: 'idle',
						actions: (context, event) => {
							context.hysteresisTime = event.time;
						},
					},
					PID: {
						target: 'idle',
						actions: (context, event) => {
							context.PID = {
								kp: event.kp,
								ki: event.ki,
								kd: event.kd,
								pOn: event.pOn,
							};
						},
					},
					PREPARE_ABSOLUTE_TIME: {
						target: 'preparing',
						actions: (context, event) => {
							context.preparing_time = event.preparing_time;
						},
					},
					WATTS: {
						target: 'idle',
						actions: (context, event) => {
							context.watts = event.watts;
						},
					},
					WAIT_TEMPERATURE: {
						target: 'heating',
						actions: (context, event) => {
							context.targetTemperature = event.temperature;
						},
					},
				},
			},
			preparing: {
				transitions: {
					READ_TEMPERATURE: [
						{
							target: 'preparing',
							actions: (context, event) => {
								context.currentTemperature = event.temperature;
							},
							cond: (context, event) => {
								// check if the time required to heat the water is less than the preparing time
								const minimumRemainingTime = calculateHeatingTimeSeconds(
									context.volume,
									context.watts,
									context.currentTemperature,
									context.targetTemperature,
								);

								return context.preparing_time - Date.now() >= minimumRemainingTime;
							},
						},
					],
					STOP: {
						target: 'done',
					},
				},
			},
			confirm: {
				transitions: {
					STOP: {
						target: 'done',
					},
					CONFIRM: {
						target: 'idle',
					},
				},
			},
			timer: {
				transitions: {
					STOP: {
						target: 'done',
					},
				},
			},
			heating: {
				transitions: {
					READ_TEMPERATURE: [
						{
							target: 'idle',

							actions: (context, event) => {
								context.currentTemperature = event.temperature;
							},
							cond: (context, event) => {
								const hysteresis = context.hysteresisTemp;
								return event.temperature >= context.targetTemperature - hysteresis;
							},
						},
						{
							target: 'heating',
							actions: (context, event) => {
								context.currentTemperature = event.temperature;
							},
						},
					],
					STOP: {
						target: 'done',
					},
				},
			},
			done: {
				transitions: {},
			},
		},
	});
