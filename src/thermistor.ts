export class Thermistor {
	private pin: Pin;
	constructor(
		pin: number,
		private beta: number = 3950,
		private r0: number = 10000,
		private t0: number = 25,
		private rSeries: number = 100000,
		private voltageReference: number = 3.3,
	) {
		this.pin = new Pin(pin);
	}

	private readTemperature(pin, beta, r0, t0, rSeries, voltageReference = 3.3): number {
		var adc = analogRead(pin); // Read ADC value (0 to 1)
		var v = adc * voltageReference; // Convert to voltage (assuming 3.3V system)

		// Convert voltage to resistance
		var rThermistor = rSeries * (v / (voltageReference - v));

		// Convert resistance to temperature using the Steinhart-Hart equation
		var tKelvin = 1 / (1 / (t0 + 273.15) + (1 / beta) * Math.log(rThermistor / r0));
		var tCelsius = tKelvin - 273.15; // Convert to Celsius

		return tCelsius;
	}

	getTemp(): number {
		return this.readTemperature(
			this.pin,
			this.beta,
			this.r0,
			this.t0,
			this.rSeries,
			this.voltageReference,
		);
	}
}
