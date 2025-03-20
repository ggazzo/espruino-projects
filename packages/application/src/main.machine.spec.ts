import assert from 'assert/strict';
import { test, describe } from 'node:test';
import { create } from './main.machine';

test('should initialize in the idle state', () => {
	const machine = create();
	assert.strictEqual(machine.getState(), 'idle');
});

test('should transition to done state on STOP event from idle state', () => {
	const machine = create();
	machine.send({ type: 'STOP' });
	assert.strictEqual(machine.getState(), 'done');
});

describe('confirm state', () => {
	test('should transition to idle state on CONFIRM event from confirm state', () => {
		const machine = create();
		machine.send({ type: 'ENTER_CONFIRM' });
		assert.strictEqual(machine.getState(), 'confirm');
		machine.send({ type: 'CONFIRM' });
		assert.strictEqual(machine.getState(), 'idle');
	});
});

describe('heating state', () => {
	test('should transition to done state on STOP event from heating state', () => {
		const machine = create();
		machine.send({ type: 'WAIT_TEMPERATURE', temperature: 25 });
		assert.strictEqual(machine.getState(), 'heating');
		assert.strictEqual(machine.getContext().targetTemperature, 25);
		machine.send({ type: 'STOP' });
		assert.strictEqual(machine.getState(), 'done');
	});

	test('should transition to idle only after reaching target temperature on READ_TEMPERATURE event from heating state', () => {
		const machine = create();
		machine.send({ type: 'WAIT_TEMPERATURE', temperature: 25 });
		assert.strictEqual(machine.getState(), 'heating');
		assert.strictEqual(machine.getContext().targetTemperature, 25);

		machine.send({ type: 'READ_TEMPERATURE', temperature: 10 });
		assert.strictEqual(machine.getState(), 'heating');
		machine.send({ type: 'READ_TEMPERATURE', temperature: 15 });
		assert.strictEqual(machine.getState(), 'heating');
		machine.send({ type: 'READ_TEMPERATURE', temperature: 20 });
		assert.strictEqual(machine.getState(), 'heating');
		machine.send({ type: 'READ_TEMPERATURE', temperature: 30 });

		assert.strictEqual(machine.getState(), 'idle');
	});
});
