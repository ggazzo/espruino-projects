#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const rootDir = join(__dirname, '..');

// Configuration
const PORT = process.env.ESPRUINO_PORT || ''; // Can be provided as an environment variable
const baudRate = 9600;
const jobFile = join(rootDir, 'espruino.job.json');

// Check if Espruino CLI is installed
try {
	const espruinoVersion = spawn('espruino', ['--version'], { stdio: 'pipe' });
	espruinoVersion.on('error', err => {
		console.error(
			'Error: Espruino CLI not found. Please install it with "npm install -g espruino"',
		);
		process.exit(1);
	});
} catch (error) {
	console.error('Error checking Espruino CLI:', error.message);
	process.exit(1);
}

// Check if job file exists
if (!existsSync(jobFile)) {
	console.error(`Error: Espruino job file not found at ${jobFile}`);
	process.exit(1);
}

// Helper function to run a command
const runCommand = (command, args, options = {}) => {
	return new Promise((resolve, reject) => {
		console.log(`Running: ${command} ${args.join(' ')}`);

		const process = spawn(command, args, {
			stdio: 'inherit',
			...options,
		});

		process.on('close', code => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Command "${command}" failed with exit code ${code}`));
			}
		});

		process.on('error', err => {
			reject(new Error(`Failed to execute "${command}": ${err.message}`));
		});
	});
};

const buildAndUpload = async () => {
	try {
		// Clean previous build
		console.log('Cleaning previous build...');
		await runCommand('rimraf', ['build']);

		// Compile TypeScript
		console.log('Compiling TypeScript...');
		await runCommand('tsc', []);

		// Prepare for Espruino
		console.log('Preparing for Espruino...');
		await runCommand('node', [join(rootDir, 'scripts', 'prepare-for-espruino.js')]);

		// Build Espruino bundle
		console.log('Building Espruino bundle...');
		const espArgs = ['-j', jobFile, 'build/main.js', '-o', 'build.js'];
		await runCommand('espruino', espArgs);

		// Upload to Espruino board
		console.log('Uploading to Espruino board...');
		const uploadArgs = ['-j', jobFile];

		// Add port if specified
		if (PORT) {
			uploadArgs.push('-p', PORT);
		}

		uploadArgs.push('build.js');
		await runCommand('espruino', uploadArgs);

		console.log('✅ Upload completed successfully!');
	} catch (error) {
		console.error('❌ Error:', error.message);
		process.exit(1);
	}
};

// Execute the build and upload process
buildAndUpload();
