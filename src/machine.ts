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

export class FiniteStateMachine<
	TStates extends string,
	TEvent extends { type: string } = { type: string },
	TContext extends {
		[context: string]: any;
	} = {},
	TConfig extends MachineConfig<TContext, TStates, any> = MachineConfig<TContext, TStates, any>,
> extends Emitter<{
	stateChange: {
		previousState: TStates;
		currentState: TStates;
		event: TEvent;
	};
}> {
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
		const currentStateConfig = this.config.states[this.currentState];

		// Check if the guard condition passes (if there is one)
		if (transition.cond && !transition.cond(this.context, event)) {
			return false;
		}

		// Run exit actions for current state
		// Run transition actions
		if (transition.actions) {
			transition.actions(this.context, event as any);
		}

		if (this.currentState === transition.target) {
			return false;
		}
		if (currentStateConfig.onExit) {
			currentStateConfig.onExit(this.context, event);
		}
		// Update current state
		const previousState = this.currentState;
		this.currentState = transition.target as TStates;

		// Run entry actions for new state
		const nextStateConfig = this.config.states[this.currentState];
		if (nextStateConfig.onEnter) {
			nextStateConfig.onEnter(this.context, event);
		}

		this.emit('stateChange', {
			previousState,
			currentState: this.currentState,
			event,
		});

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
