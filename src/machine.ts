import { Emitter } from '@rocket.chat/emitter';
/**
 * Finite State Machine implementation in TypeScript
 *
 * This implementation provides a flexible and type-safe way to create and
 * manage state machines with strong typing support for states, events, and context.
 */

interface Transaction<
	TContext,
	TEvent extends {
		type: string;
	},
	TTargets,
	TCurrentTarget extends string = string,
> {
	target: TTargets;
	// Guard condition that must be true for the transition to occur
	cond?: (context: TContext, event: TEvent) => boolean;
	// Actions to run during the transition
	actions?: (
		context: TContext,
		event: TCurrentTarget extends TEvent['type']
			? TEvent extends { type: TCurrentTarget }
				? TEvent
				: never
			: never,
	) => void;
}

type SingleOrArray<T> = T | T[];

// Define types for the state machine
export type StateConfig<
	TContext extends {
		[context: string]: any;
	},
	TEvent extends { type: string },
	TTargets extends string = string,
> = {
	// Actions that run when entering this state
	onEnter?: (context: TContext, event?: TEvent) => void;
	// Actions that run when exiting this state
	onExit?: (context: TContext, event?: TEvent) => void;
	// Transitions to other states
	transitions: {
		[K in TEvent['type']]?: SingleOrArray<Transaction<TContext, TEvent, TTargets, K>>;
	};
};

type States<K extends string, State extends StateConfig<any, any, K>> = {
	[key in K]: State;
};

export type MachineConfig<
	TContext,
	TStatesNames extends string,
	TStates extends States<TStatesNames, StateConfig<TContext, any, TStatesNames>>,
> = {
	// The initial state of the machine
	initial: TStatesNames;
	// The context (data) shared across all states
	context: TContext;
	// The states of the machine
	states: TStates;
};

type String<T> = T extends string ? T : never;
type EventTypesBase<Prefix extends string, TStates extends string> = `${Prefix}.${TStates}`;
type EventTypes<Suffix extends string> = EventTypesBase<'state.enter' | 'state.exit', Suffix>;

type Merge<T, U> = {
	[K in keyof T | keyof U]: K extends keyof T ? T[K] : K extends keyof U ? U[K] : never;
};

export class FiniteStateMachine<
	TStates extends string,
	TEvent extends { type: string } = { type: string },
	TContext extends {
		[context: string]: any;
	} = {},
	TConfig extends MachineConfig<TContext, TStates, any> = MachineConfig<TContext, TStates, any>,
> extends Emitter<
	Merge<
		{
			[K in EventTypesBase<'context.update', String<keyof TContext>>]: {
				value: TContext[K extends `${infer Prefix}.${infer Suffix}` ? Suffix : K];
			};
		},
		{
			[K in EventTypes<TStates> | 'state.change']: {
				previousState: TStates;
				currentState: TStates;
				event: TEvent;
			};
		}
	>
> {
	private currentState: TStates;
	private config: TConfig;
	private context: TContext;

	static create<
		TStatesNames extends string,
		TEvent extends { type: string },
		TContext extends { [context: string]: any } = {},
		TStates extends States<TStatesNames, StateConfig<TContext, TEvent, TStatesNames>> = States<
			TStatesNames,
			StateConfig<TContext, TEvent, TStatesNames>
		>,
	>(
		config: MachineConfig<TContext, TStatesNames, TStates>,
	): FiniteStateMachine<
		TStatesNames,
		TEvent,
		TContext,
		MachineConfig<TContext, TStatesNames, TStates>
	> {
		return new FiniteStateMachine<
			TStatesNames,
			TEvent,
			TContext,
			MachineConfig<TContext, TStatesNames, TStates>
		>(config);
	}

	/**
	 * Create a new finite state machine
	 * @param config The configuration for the state machine
	 */
	constructor(config: TConfig) {
		super();
		this.config = config;
		this.context = config.context;
		this.currentState = config.initial as TStates;

		// Run onEnter for the initial state if it exists
		const initialState = this.config.states[this.currentState];
		if (initialState?.onEnter) {
			initialState.onEnter(this.context);
		}
	}

	private processTransition(
		transition: Transaction<TContext, TEvent, any, any>,
		event: TEvent,
	): boolean {
		const previousState = this.currentState;
		const currentStateConfig = this.config.states[this.currentState];

		// Check if the guard condition passes (if there is one)
		if (transition.cond && !transition.cond(this.context, event)) {
			return false;
		}

		const context = JSON.parse(JSON.stringify(this.context)) as TContext;
		// Run exit actions for current state
		// Run transition actions
		if (transition.actions) {
			transition.actions(context, event as any);
		}

		if (this.currentState === transition.target) {
			Object.entries(context).forEach(([key, value]) => {
				if (this.context[key] !== value) {
					this.context[key as keyof TContext] = value;
					this.emit(`context.update.${key as String<keyof TContext>}`, {
						previousState,
						currentState: this.currentState,
						event,
						key,
						value,
					} as any);
				}
			});
			return false;
		}
		if (currentStateConfig.onExit) {
			currentStateConfig.onExit(context, event);
		}
		// Update current state
		this.currentState = transition.target as TStates;

		// Run entry actions for new state
		const nextStateConfig = this.config.states[this.currentState];
		if (nextStateConfig.onEnter) {
			nextStateConfig.onEnter(context, event);
		}

		Object.entries(context).forEach(([key, value]) => {
			if (this.context[key] !== value) {
				this.emit(`context.update.${key as String<keyof TContext>}`, {
					previousState,
					currentState: this.currentState,
					event,
					key,
					value,
				} as any);
				this.context[key as keyof TContext] = value;
			}
		});

		this.emit(`state.exit.${previousState}`, {
			previousState,
			currentState: this.currentState,
			event,
		} as any);

		this.emit(`state.enter.${this.currentState}`, {
			previousState,
			currentState: this.currentState,
			event,
		} as any);

		this.emit('state.change', {
			previousState,
			currentState: this.currentState,
			event,
		} as any);

		console.log(`Transition: ${previousState} -> ${this.currentState} (${event.type})`);

		return true;
	}
	/**
	 * Send an event to the state machine to trigger a transition
	 * @param event The event to send
	 * @returns The current state after processing the event
	 */
	public send(event: TEvent): TStates {
		const currentStateConfig = this.config.states[this.currentState];

		// Check if there's a transition for this event
		const transition = currentStateConfig.transitions[event.type];

		if (!transition) {
			console.warn(`No transition found for event ${event.type} in state ${this.currentState}`);
			return this.currentState;
		}

		const previousState = this.currentState;
		for (const t of Array.isArray(transition) ? transition : [transition]) {
			const changed = this.processTransition(t, event);
			if (changed) {
				return this.currentState;
			}
		}
		return this.currentState;
	}

	/**
	 * Get the current state of the machine
	 */
	public getState(): TStates {
		return this.currentState;
	}

	/**
	 * Get the current context of the machine
	 */
	public getContext(): TContext {
		return { ...this.context };
	}

	/**
	 * Update the context of the machine
	 * @param contextUpdate A partial context object to merge with the current context
	 */
	public updateContext(contextUpdate: Partial<TContext>): void {
		this.context = { ...this.context, ...contextUpdate };
	}

	/**
	 * Check if the machine is in a specific state
	 * @param state The state to check
	 */
	public matches(state: string): boolean {
		return this.currentState === state;
	}
}
