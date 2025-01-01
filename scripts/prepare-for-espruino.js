import { readFile, writeFileSync } from 'node:fs';
import recursive from 'recursive-readdir';

recursive('build', [], async (err, files) => {
	for (let file of files) {
		readFile(file, { encoding: 'utf8' }, (err, content) => {
			content = content.replace('"use strict";', '');
			content = content.replace(
				'Object.defineProperty(exports, "__esModule", { value: true });',
				'',
			);
			content = content.replace('require("@/', 'require("');

			writeFileSync(file, content);
		});
	}
});
