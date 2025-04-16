import { FiniteStateMachine } from '@tspruino/machine';

export const createHeatingMachine = () =>
	FiniteStateMachine.create<
		'idle' | 'heating' | 'pid',
		| {
				type: 'READ_TEMPERATURE';
				temperature: number;
		  }
		| { type: 'HEAT'; target: number }
		| { type: 'STOP' }
		| { type: 'DONE'; output: number; lastTimePID: number },
		{
			temperature: number;
			target: number;
			counter_measurement: number;
			output: number;
			lastTimePID: number;
		}
	>({
		context: {
			temperature: 0,
			target: 0,
			counter_measurement: 0,
			output: 0,
			lastTimePID: 0,
		},
		initial: 'idle',
		states: {
			idle: {
				transitions: {
					READ_TEMPERATURE: [
						{
							target: 'idle',
							actions: (context, event) => {
								context.temperature = event.temperature;
							},
						},
					],
					HEAT: {
						target: 'heating',
						actions: (context, event) => {
							context.target = event.target;
						},
					},
				},
			},
			pid: {
				transitions: {
					DONE: {
						target: 'heating',
						actions: (context, event) => {
							context.output = event.output;
							context.lastTimePID = event.lastTimePID;
						},
					},
				},
			},
			heating: {
				onExit(context, event) {
					context.counter_measurement = 0;
				},
				transitions: {
					READ_TEMPERATURE: [
						{
							target: 'heating',
							actions: function (context, event) {
								context.counter_measurement += 1;
							},
							cond: (context, event) => context.counter_measurement < 10,
						},
						{
							target: 'pid',
							cond: (context, event) => context.counter_measurement >= 10,
						},
					],
					STOP: {
						target: 'idle',
					},
				},
			},
		},
	});
