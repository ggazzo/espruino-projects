import { FiniteStateMachine } from '@tspruino/machine';

export const createReadMachine = () => {
	return FiniteStateMachine.create<
		'idle' | 'opening' | 'opened' | 'reading',
		| {
				type: 'OPEN_FILE';
				file: string;
		  }
		| {
				type: 'OK';
		  }
		| {
				type: 'READ_LINE';
		  }
		| {
				type: 'DONE';
		  },
		{
			file: string;
		}
	>({
		context: {
			file: '',
		},
		initial: 'idle',
		states: {
			idle: {
				transitions: {
					OPEN_FILE: {
						target: 'opening',
						actions: (context, event: any) => {
							context.file = event.file;
						},
					},
				},
			},
			opening: {
				transitions: {
					OK: {
						target: 'opened',
					},
				},
			},
			opened: {
				transitions: {
					READ_LINE: {
						target: 'reading',
					},
					DONE: {
						target: 'idle',
					},
				},
			},
			reading: {
				transitions: {
					OK: {
						target: 'opened',
					},
					DONE: {
						target: 'idle',
					},
				},
			},
		},
	});
};
