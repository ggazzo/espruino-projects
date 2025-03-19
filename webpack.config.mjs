import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Webpack configuration enhanced with Re.Pack defaults for React Native.
 *
 * Learn about webpack configuration: https://webpack.js.org/configuration/
 * Learn about Re.Pack configuration: https://re-pack.dev/docs/guides/configuration
 */

export default {
	mode: 'development',
	context: __dirname,
	entry: './src/main.ts',
	// target: 'es6',
	resolve: {
		extensions: ['.ts', '.js', '.json'],
	},

	devtool: 'hidden-source-map',
	module: {
		rules: [
			{
				test: /\.[cm]?[jt]sx?$/,
				use: 'babel-loader',
				type: 'javascript/auto',
			},
		],
	},
	// optimization: {
	// 	minimizer: [
	// 		new TerserPlugin({
	// 			test: /\.(js)?bundle(\?.*)?$/i,
	// 			extractComments: false,
	// 			terserOptions: {
	// 				format: {
	// 					comments: false,
	// 				},
	// 			},
	// 		}),
	// 	],
	// },
};

// const webpack = require('webpack');
// const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

// module.exports = {
// 	entry: './src/main.ts',
// 	output: {
// 		path: path.resolve(__dirname, 'dist'),
// 		filename: 'entry.bundle.js',
// 	},
// 	module: {
// 		rules: [
// 			{
// 				test: /\.js$/,
// 				exclude: /node_modules/,
// 				use: {
// 					loader: 'babel-loader',
// 				},
// 			},
// 		],
// 	},
// 	optimization: {
// 		minimizer: [
// 			new UglifyJsPlugin({
// 				cache: true,
// 				parallel: true,
// 				uglifyOptions: {
// 					compress: true,
// 					ecma: 6,
// 					mangle: false, // Disable name mangling to avoid this issue: https://github.com/espruino/Espruino/issues/1367
// 				},
// 				sourceMap: true,
// 			}),
// 		],
// 	},
// };
