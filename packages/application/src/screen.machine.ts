import { FiniteStateMachine } from '@tspruino/machine';

export const createScreenMachine = () =>
	FiniteStateMachine.create<
		'idle' | 'menu',
		| {
				type: 'MENU';
		  }
		| {
				type: 'DONE';
		  },
		{}
	>({
		context: {},
		initial: 'idle',
		states: {
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
