import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { createHeatingMachine } from './heating.machine';

beforeEach(() => {
	// Reset the machine to its initial state before each test
	// machine.updateContext({
	// 	temperature: 0,
	// 	counter_measurement: 0,
	// 	output: 0,
	// });
	// machine.send({ type: 'STOP' });
});

test('should initialize in the idle state', () => {
	const machine = createHeatingMachine();
	assert.strictEqual(machine.getState(), 'idle');
});

test('should stay in idle state and update temperature on READ_TEMPERATURE event', () => {
	const machine = createHeatingMachine();
	machine.send({ type: 'READ_TEMPERATURE', temperature: 25 });
	assert.strictEqual(machine.getState(), 'idle');
	assert.strictEqual(machine.getContext().temperature, 25);
});

test('should transition to heating state on HEAT event', () => {
	const machine = createHeatingMachine();
	machine.send({ type: 'HEAT' });
	assert.strictEqual(machine.getState(), 'heating');
});

test('should increment counter_measurement in heating state on READ_TEMPERATURE event', () => {
	const machine = createHeatingMachine();
	machine.send({ type: 'HEAT' });
	machine.send({ type: 'READ_TEMPERATURE', temperature: 30 });
	assert.strictEqual(machine.getState(), 'heating');
	assert.strictEqual(machine.getContext().counter_measurement, 1);
});

test('should transition to pid state after 10 READ_TEMPERATURE events in heating state', () => {
	const machine = createHeatingMachine();
	machine.send({ type: 'HEAT' });
	assert.strictEqual(machine.getState(), 'heating');
	for (let i = 0; i < 10; i++) {
		machine.send({ type: 'READ_TEMPERATURE', temperature: 30 });
	}
	assert.strictEqual(machine.getState(), 'pid');
});

test('should reset counter_measurement on exiting heating state', () => {
	const machine = createHeatingMachine();
	machine.send({ type: 'HEAT' });
	for (let i = 0; i < 10; i++) {
		machine.send({ type: 'READ_TEMPERATURE', temperature: 30 });
	}

	machine.send({ type: 'DONE' });
	assert.strictEqual(machine.getState(), 'heating');
	assert.strictEqual(machine.getContext().counter_measurement, 0);
});

test('should transition back to idle state on STOP event', () => {
	const machine = createHeatingMachine();
	machine.send({ type: 'HEAT' });
	machine.send({ type: 'STOP' });
	assert.strictEqual(machine.getState(), 'idle');
});
