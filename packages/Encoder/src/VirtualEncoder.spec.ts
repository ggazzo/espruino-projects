import { VirtualEncoder } from './index.js';
import { test, beforeEach } from 'node:test';
import assert from 'assert';

test('should emit "change" event with +1 when rotating clockwise', done => {
	const encoder = new VirtualEncoder();
	encoder.on('change', (direction: number) => {
		assert.strictEqual(direction, 1);
	});
	encoder.trigger(1, 0); // Simulate rotation
	encoder.trigger(1, 1);
});

test('should emit "change" event with -1 when rotating counter-clockwise', done => {
	const encoder = new VirtualEncoder();
	encoder.on('change', (direction: number) => {
		assert.strictEqual(direction, -1);
	});
	encoder.trigger(0, 1); // Simulate rotation
	encoder.trigger(1, 1);
});

test('should not emit "change" event when there is no rotation', () => {
	const encoder = new VirtualEncoder();
	let called = false;
	encoder.on('change', () => {
		called = true;
	});
	encoder.trigger(0, 0); // No rotation
	assert.strictEqual(called, false);
});
