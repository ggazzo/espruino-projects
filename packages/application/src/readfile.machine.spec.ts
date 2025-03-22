import assert from 'assert/strict';
import { test } from 'node:test';
import { createReadMachine } from './readfile.machine';

test('should initialize in the idle state', () => {
	const machine = createReadMachine();
	assert.strictEqual(machine.getState(), 'idle');
});

test('should transition to opened state on OPEN_FILE event', () => {
	const machine = createReadMachine();
	machine.send({ type: 'OPEN_FILE', file: 'example.txt' });
	assert.strictEqual(machine.getState(), 'opening');
	assert.strictEqual(machine.getContext().file, 'example.txt');
	machine.send({ type: 'OK' });
	assert.strictEqual(machine.getState(), 'opened');
});

test('should transition back to idle state on DONE event', () => {
	const machine = createReadMachine();
	machine.send({ type: 'OPEN_FILE', file: 'example.txt' });
	assert.strictEqual(machine.getState(), 'opening');
	machine.send({ type: 'OK' });
	assert.strictEqual(machine.getState(), 'opened');
	machine.send({ type: 'DONE' });
	assert.strictEqual(machine.getState(), 'idle');
});
