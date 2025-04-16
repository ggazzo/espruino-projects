import { test } from 'node:test';
import assert from 'node:assert/strict';
import { throttle } from '.';

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('throttle calls function immediately on first invocation', () => {
	let callCount = 0;
	const fn = () => callCount++;
	const throttledFn = throttle(fn, 100);

	throttledFn();
	assert.strictEqual(callCount, 1);
});

test('throttle prevents function from being called too soon', async () => {
	let callCount = 0;
	const fn = () => callCount++;
	const throttledFn = throttle(fn, 100);

	throttledFn(); // First call
	throttledFn(); // Should be throttled
	throttledFn(); // Should be throttled

	assert.strictEqual(callCount, 1);
	await delay(150);
	assert.strictEqual(callCount, 2); // Second call happens after delay
});

test('throttle executes function after delay when called repeatedly', async () => {
	let callCount = 0;
	const fn = () => callCount++;
	const throttledFn = throttle(fn, 100);

	throttledFn(); // First call
	await delay(50);
	throttledFn(); // Should be delayed
	await delay(60);
	assert.strictEqual(callCount, 2); // Second call should have executed
});

test('throttle resets timer on frequent calls', async () => {
	let callCount = 0;
	const fn = () => callCount++;
	const throttledFn = throttle(fn, 100);

	throttledFn(); // First call
	await delay(50);
	throttledFn(); // Resets the timer
	await delay(50);
	throttledFn(); // Still within delay, should be postponed
	await delay(60);
	assert.strictEqual(callCount, 3);
});
