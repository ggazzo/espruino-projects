import { Emitter } from '@tspruino/emitter';

type Item = NumericItem | BooleanItem;

// // & (NumericItem | BooleanItem | {});

type NumericItem = {
	text: string;
	value: number;
	format?: (value: number) => string;
	step: number;
	wrap?: boolean;
	min: number;
	max: number;
};

type BooleanItem = {
	text: string;
	format?: (value: boolean) => string;
	value: boolean;
};

// change and
type V = 'change' | 'submit';

type ReplaceKey<
	T extends {
		[key: string]: any;
	},
> = {
	[K in keyof T as `${V}:${K extends string ? K : never}`]: T[K];
};

type FromItemToEvents<TItems, K extends keyof TItems = keyof TItems> = ReplaceKey<{
	[key in K]: TItems[key] extends Item ? TItems[key]['value'] : never;
}>;

export type ExtractFromItemToEvents<M extends Menu<any, any>> =
	M extends Menu<any, infer A> ? A : never;

type String<T> = T extends string ? T : never;

export class Menu<
	TItems extends { [key: string]: Item },
	TEvents extends FromItemToEvents<TItems>,
> extends Emitter<TEvents> {
	private _title: string;
	private readonly _items: TItems;
	private _selected: number;
	private _selectEdit: Item | undefined;
	private readonly _fontHeight: number;
	private readonly _x: number;
	private readonly _y: number;
	private readonly _x2: number;
	private readonly _y2: number;
	private readonly _cBg: number;
	private readonly _cFg: number;
	private readonly _cHighlightBg: number;
	private readonly _cHighlightFg: number;

	private _itemsKeys: Array<String<keyof TItems>>;

	constructor(
		private readonly _g: Graphics,
		_title: string,
		_items: TItems,
	) {
		super();
		this._title = _title;
		this._items = _items;
		this._itemsKeys = Object.keys(_items) as unknown as Array<String<keyof TItems>>;
		this._selected = 0;
		this._fontHeight = 6;
		this._x = 0;
		this._y = 0;
		this._x2 = this._g.getWidth() - 1;
		this._y2 = this._g.getHeight() - 1;
		this._cBg = 0;
		this._cFg = -1;
		this._cHighlightBg = -1;
		this._cHighlightFg = 0;
	}

	public draw() {
		this._g.clear();
		this._g.setFont('4x6');
		this._g.setColor(this._cFg);
		// if (this._predraw) this._predraw(_g);
		this._g.setFontAlign(0, -1);
		if (this._title) {
			this._g.drawString(this._title, (this._x + this._x2) / 2, this._y - this._fontHeight - 2);
			this._g.drawLine(this._x, this._y - 2, this._x2, this._y - 2);
		}

		var rows = 0 | Math.min((this._y2 - this._y) / this._fontHeight, this._itemsKeys.length);
		var idx = E.clip(this._selected - (rows >> 1), 0, this._itemsKeys.length - rows);
		var iy = this._y;
		var less = idx > 0;

		while (rows--) {
			var name = this._itemsKeys[idx];
			var item: Item = this._items[name];
			var hl = idx == this._selected && !this._selectEdit;
			this._g.setColor(hl ? this._cHighlightBg : this._cBg);
			this._g.fillRect(this._x, iy, this._x2, iy + this._fontHeight - 1);
			this._g.setColor(hl ? this._cHighlightFg : this._cFg);
			this._g.setFontAlign(-1, -1);
			this._g.drawString(name, this._x, iy);
			if ('object' == typeof item) {
				var xo = this._x2;
				var v = item.format?.(item.value) ?? item.value;

				if (this._selectEdit && idx == this._selected) {
					var s = this._fontHeight > 10 ? 2 : 1;
					xo -= 12 * s + 1;
					this._g.setColor(this._cHighlightBg);
					this._g.fillRect(
						xo - (this._g.stringWidth(v) + 4),
						iy,
						this._x2,
						iy + this._fontHeight - 1,
					);
					this._g.setColor(this._cHighlightFg);
					this._g.drawImage(
						{ width: 12, height: 5, buffer: ' \x07\x00\xF9\xF0\x0E\x00@', transparent: 0 },
						xo,
						iy + (this._fontHeight - 5 * s) / 2,
						{ scale: s },
					);
				}
				this._g.setFontAlign(1, -1);
				this._g.drawString(v, xo - 2, iy);
			}
			this._g.setColor(this._cFg);
			iy += this._fontHeight;
			idx++;
		}
		this._g.setFontAlign(-1, -1);
		// if (this._preflip) this._preflip(_g, less, idx < this._itemsKeys.length);
		if (this._g.flip) this._g.flip();
	}

	select() {
		var item = this._items[this._itemsKeys[this._selected]];
		if (this._itemsKeys[this._selected] === 'Back') {
			// Handle "Back" option
			// Logic to navigate back to the parent menu
		} else {
			if ('object' == typeof item) {
				// if a number, go into 'edit mode'
				if ('number' == typeof item.value) {
					this._selectEdit = this._selectEdit ? undefined : item;
					if (this._selectEdit) {
						this.emit(`submit:${this._itemsKeys[this._selected]}`, item.value as any);
					}
				} else {
					// else just toggle bools
					if ('boolean' == typeof item.value) {
						item.value = !item.value;
						this.emit(`change:${this._itemsKeys[this._selected]}`, item.value as any);
					}
				}
				this.draw();
			}
		}
	}

	move(dir: 1 | -1) {
		var item = this._selectEdit as NumericItem;
		if (item) {
			item.value -= ((dir || 1) * (item.step || 1)) as any;
			if (item.min !== undefined && item.value < item.min)
				item.value = item.wrap ? item.max : item.min;
			if (item.max !== undefined && item.value > item.max)
				item.value = item.wrap ? item.min : item.max;
			this.emit(`change:${this._itemsKeys[this._selected]}`, item.value as any);
		} else {
			this._selected = (dir + this._selected + this._itemsKeys.length) % this._itemsKeys.length;
		}
		this.draw();
	}
}
