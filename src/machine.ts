import { Emitter } from '@rocket.chat/emitter';
/**
 * Finite State Machine implementation in TypeScript
 *
 * This implementation provides a flexible and type-safe way to create and
 * manage state machines with strong typing support for states, events, and context.
 */

interface Transaction<TContext, TEvent> {
	target: string;
	// Guard condition that must be true for the transition to occur
	cond?: (context: TContext, event: TEvent) => boolean;
	// Actions to run during the transition
	actions?: (context: TContext, event: TEvent) => void;
}

type SingleOrArray<T> = T | T[];

// Define types for the state machine
export type StateConfig<TContext, TEvent> = {
	// Actions that run when entering this state
	onEnter?: (context: TContext, event?: TEvent) => void;
	// Actions that run when exiting this state
	onExit?: (context: TContext, event?: TEvent) => void;
	// Transitions to other states
	transitions: {
		[eventType: string]: SingleOrArray<Transaction<TContext, TEvent>>;
	};
};

export type MachineConfig<
	TContext,
	TEvent,
	TStates extends {
		[state: string]: StateConfig<TContext, TEvent>;
	} = {},
> = {
	// The initial state of the machine
	initial: string;
	// The context (data) shared across all states
	context: TContext;
	// The states of the machine
	states: TStates;
};

export class FiniteStateMachine<
	TContext extends Record<string, any> = Record<string, any>,
	TEvent extends { type: string } = { type: string },
> extends Emitter<{
	stateChange: {
		previousState: string;
		currentState: string;
		event: TEvent;
	};
}> {
	private currentState: string;
	private config: MachineConfig<TContext, TEvent>;
	private context: TContext;

	/**
	 * Create a new finite state machine
	 * @param config The configuration for the state machine
	 */
	constructor(config: MachineConfig<TContext, TEvent>) {
		super();
		this.config = config;
		this.context = { ...config.context };
		this.currentState = config.initial;

		// Run onEnter for the initial state if it exists
		const initialState = this.config.states[this.currentState];
		if (initialState?.onEnter) {
			initialState.onEnter(this.context);
		}
	}

	private processTransition(
		transition: Transaction<TContext, TEvent>,
		context: TContext,
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
			transition.actions(this.context, event);
		}

		if (this.currentState === transition.target) {
			return false;
		}
		if (currentStateConfig.onExit) {
			currentStateConfig.onExit(this.context, event);
		}
		// Update current state
		const previousState = this.currentState;
		this.currentState = transition.target;

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
	public send(event: TEvent): string {
		const currentStateConfig = this.config.states[this.currentState];

		// Check if there's a transition for this event
		const transition = currentStateConfig.transitions[event.type];

		if (!transition) {
			console.warn(`No transition found for event ${event.type} in state ${this.currentState}`);
			return this.currentState;
		}

		const previousState = this.currentState;
		for (const t of Array.isArray(transition) ? transition : [transition]) {
			const changed = this.processTransition(t, this.context, event);
			if (changed) {
				return this.currentState;
			}
		}
		return this.currentState;
	}

	/**
	 * Get the current state of the machine
	 */
	public getState(): string {
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
