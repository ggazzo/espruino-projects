class Button {
	constructor(private readonly _label: string) {}

	render(g: Graphics) {
		g.setFont('4x6', 2);
		const textSize = g.stringMetrics(this._label);
		const width = textSize.width;
		const height = textSize.height;

		const x = g.getWidth(); // Screen width
		const y = g.getHeight(); // Screen height

		const leftMost = (x - width) / 2; // Center horizontally
		const topmost = (y - height) / 2; // Center vertically
		const padding = 4;

		g.drawString(this._label, leftMost, topmost);

		g.drawRect(
			leftMost - padding,
			topmost - padding,
			leftMost + width + padding,
			topmost + height + padding,
		);
	}
}

const confirmButton = new Button('Confirm');

export const confirmationScreen = () => {
	return {
		draw: (g: Graphics) => {
			g.clear();
			g.setFont('4x6');
			// on top of the screen
			g.drawString('Confirm?', 2, 2);
			confirmButton.render(g);
			g.flip();
		},
		press: (g: Graphics) => {
			g.clear();
			g.drawString('Confirmed!', g.getWidth() / 2, g.getHeight() / 2);
			g.flip();
		},
	};
};
