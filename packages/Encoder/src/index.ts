/* Copyright (c) 2013 Gordon Williams, Pur3 Ltd. See the file LICENSE for copying permission. */
/*
Module for connecting to Rotary encoder. 

```
var step = 0;
require("Encoder").connect(A1,A2,function (direction) {
  step += direction;
  print(step);
});
```

*/

import { Emitter } from '@tspruino/emitter';

export class VirtualEncoder extends Emitter<{
	change: -1 | 1;
}> {
	private _last: number = 0;

	public t(a: 0 | 1, b: 0 | 1): void {
		var s = 0;
		switch (this._last) {
			case 0b00:
				if (a) s++;
				if (b) s--;
				break;
			case 0b01:
				if (!a) s--;
				if (b) s++;
				break;
			case 0b10:
				if (a) s--;
				if (!b) s++;
				break;
			case 0b11:
				if (!a) s++;
				if (!b) s--;
				break;
		}
		this._last = a | (b << 1);
		if (s == 1 || s == -1) this.emit('change', s);
	}
}

export class Encoder extends VirtualEncoder {
	public constructor(pina: Pin, pinb: Pin) {
		super();

		const onChange = () => {
			const a = digitalRead(pina) as 0 | 1;
			const b = digitalRead(pinb) as 0 | 1;
			this.t(a, b);
		};
		// @ts-expect-error
		pinMode(pina, 'input_pulldown');
		// @ts-expect-error
		pinMode(pinb, 'input_pulldown');

		setWatch(onChange, pina, { repeat: true });
		setWatch(onChange, pinb, { repeat: true });
		onChange();
	}
}
