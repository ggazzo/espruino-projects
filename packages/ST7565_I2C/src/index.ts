// ST7565 I2C Driver for Espruino with Graphics Library Integration
const ST7565_I2C_ADDR = 0x3f; // Change if needed

// Command definitions
const CMD_DISPLAY_OFF = 0xae;
const CMD_DISPLAY_ON = 0xaf;
const CMD_SET_DISP_START_LINE = 0x40;
const CMD_SET_PAGE = 0xb0;
const CMD_SET_COLUMN_UPPER = 0x10;
const CMD_SET_COLUMN_LOWER = 0x00;
const CMD_SET_ADC_NORMAL = 0xa0;
const CMD_SET_ADC_REVERSE = 0xa1;
const CMD_SET_DISP_NORMAL = 0xa6;
const CMD_SET_DISP_REVERSE = 0xa7;
const CMD_SET_ALLPTS_NORMAL = 0xa4;
const CMD_SET_ALLPTS_ON = 0xa5;
const CMD_SET_BIAS_9 = 0xa2;
const CMD_SET_BIAS_7 = 0xa3;
const CMD_SET_COM_NORMAL = 0xc0;
const CMD_SET_COM_REVERSE = 0xc8;
const CMD_SET_POWER_CONTROL = 0x28;
const CMD_SET_RESISTOR_RATIO = 0x20;
const CMD_SET_VOLUME_FIRST = 0x81;

declare global {
	interface Graphics {
		update(): void;
		flip(): void;
	}
}

export const connectLCD = ({
	i2c,
	callback,
	addr = ST7565_I2C_ADDR,
}: {
	i2c: I2C;
	callback?: (g: Graphics) => void;
	addr?: number;
}) => {
	// Pre-allocate buffers for better performance
	const pageBuffer = new Uint8Array(128 * 8); // 128 bytes + 1 for command
	// Graphics library integration
	const g = Graphics.createArrayBuffer(128, 64, 1, {
		vertical_byte: true,
		msb: false,
		buffer: pageBuffer,
	});

	// Send a command to ST7565
	function writeCommand(cmd: number) {
		i2c.writeTo(addr, [0x00, cmd]); // Co=0, D/C#=0 (command mode)
	}

	// Set contrast level
	function setContrast(level: number) {
		writeCommand(CMD_SET_VOLUME_FIRST);
		writeCommand(level & 0x3f);
	}

	// Initialize the display
	function initST7565() {
		writeCommand(CMD_DISPLAY_OFF);
		writeCommand(CMD_SET_BIAS_9);
		writeCommand(CMD_SET_ADC_NORMAL);
		writeCommand(CMD_SET_COM_REVERSE);
		writeCommand(CMD_SET_DISP_START_LINE);

		writeCommand(CMD_SET_POWER_CONTROL | 0x4);
		writeCommand(CMD_SET_POWER_CONTROL | 0x6);
		writeCommand(CMD_SET_POWER_CONTROL | 0x7);

		writeCommand(CMD_SET_RESISTOR_RATIO | 0x6);
		writeCommand(CMD_DISPLAY_ON);
		writeCommand(CMD_SET_ALLPTS_NORMAL);
		setContrast(6); // Default contrast
	}

	// Update display with graphics buffer
	g.update = function () {
		for (let page = 0; page < 8; page++) {
			writeCommand(CMD_SET_PAGE | page);
			writeCommand(CMD_SET_COLUMN_LOWER);
			writeCommand(CMD_SET_COLUMN_UPPER);
			i2c.writeTo(addr, [0x40].concat(new Uint8Array(pageBuffer.buffer, page * 128, 128) as any));
		}
	};
	g.flip = g.update;

	initST7565();
	if (callback) {
		setTimeout(() => callback(g), 100);
	}

	return g;
};
