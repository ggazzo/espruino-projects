import babel from '@rollup/plugin-babel';
import path from 'path';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import prepack from 'rollup-plugin-prepack';

const __dirname = path.resolve();

export default {
	input: 'packages/espruino/src/index.ts',
	output: {
		file: 'dist/bundle.js',
		format: 'esm',
		sourcemap: false,
		compact: true,
		intro: `
			// Polyfill Array.prototype.slice
			if (!Array.prototype.slice) {
				Array.prototype.slice = function(start, end) {
					var array = Object(this);
					var length = array.length >>> 0;
					var start = start || 0;
					var end = end || length;
					
					// Handle negative indices
					if (start < 0) start = Math.max(length + start, 0);
					if (end < 0) end = Math.max(length + end, 0);
					
					// Ensure indices are within bounds
					start = Math.min(start, length);
					end = Math.min(end, length);
					
					// Create result array
					var result = [];
					for (var i = start; i < end; i++) {
						if (i in array) {
							result.push(array[i]);
						}
					}
					return result;
				};
			}

			// Polyfill Map with plain object
			function createSimpleMap() {
				const store = Object.create(null);
				return {
					set: (key, value) => {
						store[String(key)] = value;
						return store;
					},
					get: (key) => store[String(key)],
					has: (key) => String(key) in store,
					delete: (key) => delete store[String(key)],
					clear: () => { for (let key in store) delete store[key]; }
				};
			}
			const Map = function() { return createSimpleMap(); };
			const WeakMap = Map;  // Use same implementation for WeakMap

			// Helper for variadic arguments
			function _toArray(args) {
				return Array.prototype.slice.call(args);
			}
		`,
	},
	plugins: [
		resolve({
			extensions: ['.ts', '.js'],
			preferBuiltins: true,
		}),
		commonjs(),
		babel({
			babelHelpers: 'bundled',
			assumptions: {
				setPublicClassFields: true,
			},
			presets: [
				'@babel/preset-typescript',
				[
					'@babel/preset-env',
					{
						targets: {
							node: '8.0',
						},
						modules: false,
						exclude: [
							'transform-async-to-generator',
							'transform-regenerator',
							'proposal-async-generator-functions',
							'proposal-private-methods',
							'@babel/plugin-transform-arrow-functions',
							'transform-classes',
							'proposal-class-properties',
						],
						loose: true,
						bugfixes: true,
					},
				],
			],
			plugins: [
				// 'minify-mangle-names',
				['@babel/plugin-transform-parameters', { loose: true }],
				['@babel/plugin-proposal-object-rest-spread', { loose: true, useBuiltIns: true }],
			],
		}),
		typescript({
			tsconfig: path.resolve(__dirname, 'tsconfig.build.json'),
			sourceMap: false, // Disable source maps to reduce bundle size
			compilerOptions: {
				target: 'es5',
				removeComments: true,
			},
		}),
		terser({
			// Add minification
			compress: {
				passes: 5,
				keep_classnames: false,
				dead_code: true,
				drop_console: false,
				drop_debugger: true,
			},
			mangle: {
				toplevel: true,
				properties: {
					regex: /^_/,
				},
			},
		}),
	],
	external: [],
	treeshake: {
		moduleSideEffects: false,
		propertyReadSideEffects: false,
		tryCatchDeoptimization: false,
	},
};
