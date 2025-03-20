import path from 'node:path';
import { fileURLToPath } from 'node:url';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Webpack configuration enhanced for React with ReactFlow
 */

export default {
	mode: 'development',
	context: __dirname,
	entry: './src/index.tsx',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'bundle.js',
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js', '.json'],
	},
	devServer: {
		static: {
			directory: path.join(__dirname, 'public'),
		},
		hot: true,
		port: 3000,
	},
	devtool: 'source-map',
	// Disable asset size warnings
	performance: {
		hints: false,
		maxEntrypointSize: 512000,
		maxAssetSize: 512000,
	},
	module: {
		rules: [
			{
				test: /\.[cm]?[jt]sx?$/,
				use: 'babel-loader',
				type: 'javascript/auto',
				exclude: /node_modules/,
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
		],
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: './public/index.html',
		}),
	],
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
