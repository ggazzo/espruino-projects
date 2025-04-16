const graph = require('graph');

type Grow<T, A extends Array<T>> = ((x: T, ...xs: A) => void) extends (...a: infer X) => void
	? X
	: never;
type GrowToSize<T, A extends Array<T>, N extends number> = {
	0: A;
	1: GrowToSize<T, Grow<T, A>, N>;
}[A['length'] extends N ? 0 : A['length'] extends 10 ? 0 : 1];

export type FixedArray<T, N extends number> = GrowToSize<T, [], N>;

const drawLine = function (g: Graphics, data: Float32Array, options: any, o: any) {
	options = options || {};
	// Draw actual data
	var first = true;
	for (var i in data) {
		if (first) g.moveTo(o.getx(i), o.gety(data[i]));
		else g.lineTo(o.getx(i), o.gety(data[i]));
		first = false;
	}

	// return info that can be used for plotting extra things on the chart
	return o;
};

export const multiSeries = <
	T extends Float32Array,
	TT extends Array<T>,
	L extends number = TT['length'],
>(
	history: TT,
	title: string,
	// length: L,
) => {
	const length = history.length;
	const config = {
		miny: 0,
		axes: true,
		gridy: 50,
		maxy: 100,
		title,
	};

	return {
		add: (...values: FixedArray<number, L>) => {
			for (let i = 0; i < values.length; i++) {
				history[i].set(new Float32Array(history[i].buffer, 4));
				history[i][history[i].length - 1] = values[i];
			}
		},
		draw: function (g: Graphics) {
			var o = graph.drawAxes(g, history[0], config);
			let i = 1;
			for (let data of history) {
				o = drawLine(g, data, config, o);
				g.setFontAlign(1, i);
				g.drawString(
					Math.round(data[data.length - 1]),
					o.x + o.w,
					o.gety(data[data.length - 1]) + 3 * i * -1,
				);
				i = i - 2;
			}
			g.setFontAlign(0, -1);
			return o;
		},
	};
};

export const timeseries = (length: number, title: string) => {
	const history = new Float32Array(length);
	const config = {
		miny: 0,
		// axes: true,
		// gridy: 5,
		maxy: 100,
		title,
	};

	return {
		add: (value: number) => {
			history.set(new Float32Array(history.buffer, 4));
			// add new history element at the end
			history[history.length - 1] = value;
		},
		draw: (g: Graphics) => {
			g.clear();
			g.setFont('4x6');
			// Draw Graph
			const r = graph.drawLine(g, history, config);

			g.drawString(
				Math.round(history[history.length - 1]),
				r.x + r.w,
				r.gety(history[history.length - 1]) + 2,
			);

			g.setFontAlign(1, -1);
			g.flip();
		},
	};
};

const a = multiSeries([new Float32Array(10), new Float32Array(10)] as const, 'Temperature', 2);
