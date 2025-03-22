# FSMVisualizer Component

This component provides a visualization for finite state machines built with `@tspruino/machine`, with an interactive UI for viewing state transitions and sending events.

## Features

- Interactive graph visualization of state machine
- View current state and available transitions
- Send events with configurable payloads
- View machine context in real-time
- Track transition and event history
- Force-directed layout using D3-Force

## Usage

```tsx
import React from 'react';
import { FSMVisualizer } from '@tspruino/visualization';
import { FiniteStateMachine } from '@tspruino/machine';

// Define your state machine
const machine = FiniteStateMachine.create({
	initial: 'idle',
	context: {
		counter: 0,
		data: {},
	},
	states: {
		idle: {
			transitions: {
				START: 'active',
				CONFIGURE: {
					target: 'idle',
					action: (context, event) => {
						context.data = { ...context.data, ...event.config };
					},
				},
			},
		},
		active: {
			entry: context => {
				context.counter += 1;
			},
			transitions: {
				STOP: 'idle',
				INCREMENT: {
					target: 'active',
					action: (context, event) => {
						context.counter += event.amount || 1;
					},
				},
			},
		},
	},
});

// Define event configurations for the visualizer
const eventConfigs = [
	{
		type: 'INCREMENT',
		fields: [
			{
				name: 'amount',
				label: 'Amount to add',
				type: 'number',
				defaultValue: 1,
				step: 1,
			},
		],
	},
	{
		type: 'CONFIGURE',
		fields: [
			{
				name: 'config',
				label: 'JSON Config',
				type: 'text',
				defaultValue: '{}',
				// Example of a transform function to parse JSON
				transform: value => {
					try {
						return JSON.parse(value);
					} catch (e) {
						return {};
					}
				},
			},
		],
	},
];

function App() {
	return (
		<div style={{ width: '100vw', height: '100vh' }}>
			<FSMVisualizer machine={machine} eventConfigs={eventConfigs} />
		</div>
	);
}
```

## Props

| Prop           | Type                                           | Description                                                      |
| -------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| `machine`      | `ReturnType<typeof FiniteStateMachine.create>` | Required. The state machine to visualize.                        |
| `eventConfigs` | `EventConfig[]`                                | Optional. Configuration for events that require additional data. |

## EventConfig Interface

```ts
interface EventConfig {
	type: string; // Event type name
	fields: EventField[]; // Fields to display in the form
	defaultPayload?: Record<string, any>; // Optional default payload
}

interface EventField {
	name: string; // Field name in the payload
	label: string; // Display label
	type: 'number' | 'text' | 'boolean' | 'select'; // Input type
	defaultValue?: any; // Default value
	options?: Array<{ value: any; label: string }>; // For select fields
	step?: number; // For number inputs
	transform?: (value: any) => any; // Optional transformation function
}
```

## Styling and Customization

The component provides basic styling built-in, using a clean, minimalist UI. Nodes represent states, and edges represent transitions between states. The current active state is highlighted.

## Advanced Example

Here's an example with more complex event configuration:

```tsx
const temperatureControllerEventConfigs = [
	{
		type: 'SET_TEMPERATURE',
		fields: [
			{
				name: 'temperature',
				label: 'Target Temperature (°C)',
				type: 'number',
				defaultValue: 75,
				step: 0.5,
			},
			{
				name: 'tolerance',
				label: 'Tolerance (±°C)',
				type: 'number',
				defaultValue: 2,
				step: 0.1,
			},
		],
	},
	{
		type: 'SET_MODE',
		fields: [
			{
				name: 'mode',
				label: 'Control Mode',
				type: 'select',
				defaultValue: 'pid',
				options: [
					{ value: 'pid', label: 'PID Control' },
					{ value: 'hysteresis', label: 'Hysteresis' },
					{ value: 'manual', label: 'Manual' },
				],
			},
		],
	},
	{
		type: 'CONFIGURE_PID',
		fields: [
			{
				name: 'kp',
				label: 'Proportional Gain',
				type: 'number',
				defaultValue: 0.1,
				step: 0.01,
			},
			{
				name: 'ki',
				label: 'Integral Gain',
				type: 'number',
				defaultValue: 0.01,
				step: 0.001,
			},
			{
				name: 'kd',
				label: 'Derivative Gain',
				type: 'number',
				defaultValue: 0.001,
				step: 0.0001,
			},
		],
	},
];
```
