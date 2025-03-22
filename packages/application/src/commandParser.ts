import { create, create as createMainMachine } from './main.machine';
import * as path from 'path';

/**
 * CommandParser - Parses a line of text into a command for the main machine
 *
 * This parser handles commands in the following formats:
 * - SET_TEMPERATURE 95.5  => Sets target temperature to 95.5°C
 * - SET_VOLUME 250        => Sets volume to 250ml
 * - HEAT                  => Start heating to the target temperature
 * - TIMER 60              => Set a timer for 60 seconds
 * - WAIT                  => Wait for the current operation to complete
 * - STOP                  => Stop all operations
 */

type Prettify<T> = { [K in keyof T]: T[K] } & {};
export function commandParser(
	line: string,
): Prettify<Parameters<ReturnType<typeof create>['send']>[0]> | null {
	// Trim and normalize the line
	const trimmedLine = line.trim();

	// Skip empty lines and comments
	if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
		return null;
	}

	// Split the line into command and arguments
	const parts = trimmedLine.split(/\s+/);
	const command = parts[0].toUpperCase();

	// Parse different command types
	switch (command) {
		case 'SET_TEMPERATURE':
		case 'TEMPERATURE':
			const temperature = parseFloat(parts[1]);
			if (isNaN(temperature)) {
				throw new Error(`Invalid temperature value: ${parts[1]}`);
			}
			return { type: 'TEMPERATURE', temperature };

		case 'SET_VOLUME':
		case 'VOLUME':
			const volume = parseFloat(parts[1]);
			if (isNaN(volume)) {
				throw new Error(`Invalid volume value: ${parts[1]}`);
			}
			return { type: 'VOLUME', volume };

		case 'HEAT':
		case 'WAIT_TEMPERATURE':
			const heatTemperature = parts[1] ? parseFloat(parts[1]) : undefined;
			if (parts[1] && isNaN(heatTemperature)) {
				throw new Error(`Invalid temperature value: ${parts[1]}`);
			}
			return {
				type: 'WAIT_TEMPERATURE',
				temperature: heatTemperature || 95, // Default temperature if not specified
			};

		case 'TIMER':
			const seconds = parseInt(parts[1], 10);
			if (isNaN(seconds)) {
				throw new Error(`Invalid timer value: ${parts[1]}`);
			}
			return {
				type: 'PREPARE_ABSOLUTE_TIME',
				preparing_time: seconds,
			};

		case 'SKIP':
			return { type: 'SKIP' };

		case 'STOP':
			return { type: 'STOP' };

		case 'WATTS':
			const watts = parseFloat(parts[1]);
			if (isNaN(watts)) {
				throw new Error(`Invalid watts value: ${parts[1]}`);
			}
			return { type: 'WATTS', watts };

		case 'HYSTERESIS_TEMP':
			const hysteresisTemp = parseFloat(parts[1]);
			if (isNaN(hysteresisTemp)) {
				throw new Error(`Invalid hysteresis temperature value: ${parts[1]}`);
			}
			return { type: 'HYSTERESIS_TEMP', temperature: hysteresisTemp };

		case 'HYSTERESIS_TIME':
			const hysteresisTime = parseFloat(parts[1]);
			if (isNaN(hysteresisTime)) {
				throw new Error(`Invalid hysteresis time value: ${parts[1]}`);
			}
			return { type: 'HYSTERESIS_TIME', time: hysteresisTime };

		case 'PID':
			const kp = parseFloat(parts[1] || '0.1');
			const ki = parseFloat(parts[2] || '0.01');
			const kd = parseFloat(parts[3] || '0.001');
			const pOn = parseFloat(parts[4] || '0');
			return { type: 'PID', kp, ki, kd, pOn };

		// case 'TICK':
		// 	return { type: 'TICK' };

		case 'WAIT':
		case 'DELAY':
			// This is handled by the file reader, not sent to the main machine
			const delaySeconds = parseInt(parts[1], 10) || 1;
			// Simulate a delay by returning null and pausing the file reader
			console.log(`Waiting for ${delaySeconds} seconds...`);
			setTimeout(() => {
				console.log('Wait complete, continuing script execution');
			}, delaySeconds * 1000);
			return null;

		default:
			console.warn(`Unknown command: ${command}`);
			return null;
	}
}
