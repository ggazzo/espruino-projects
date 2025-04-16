export class Thermistor {
	constructor(
		private pin: Pin,
		private beta: number = 3950,
		private r0: number = 10000,
		private t0: number = 25,
		private rSeries: number = 10000,
		private voltageReference: number = 3.3,
	) {
		pinMode(this.pin, 'analog', true);
	}

	private readAnalog() {
		let value = 0;
		for (let i = 0; i < 50; i++) {
			value += analogRead(this.pin);
		}
		value /= 50;
		return value;
	}

	private readTemperature(
		pin: Pin,
		beta: number,
		r0: number,
		t0: number,
		rSeries: number,
		voltageReference: number = 3.3,
	): number {
		const adc = this.readAnalog();
		const VRT = adc * this.voltageReference;

		// se o se o ntc estiver conectado ao vcc
		// const resistance = r0 / (voltageReference / VRT - 1);
		const resistance = ((voltageReference - VRT) * rSeries) / VRT;
		const inverseKelvin = 1.0 / (t0 + 273.15) + (1.0 / beta) * Math.log(resistance / r0);
		const tKelvin = 1.0 / inverseKelvin;
		const tCelsius = tKelvin - 273.15;
		return tCelsius;

		// inline double NTC_Thermistor::resistanceToKelvins(const double resistance) {
		// 	const double inverseKelvin = 1.0 / this->nominalTemperature +
		// 		log(resistance / this->nominalResistance) / this->bValue;
		// 	return (1.0 / inverseKelvin);
		// }

		// inline double NTC_Thermistor::readResistance() {
		// }

		// const adc = analogRead(this.pin); // valor de 0.0 a 1.0
		// const VRT = adc * this.voltageReference;

		// // Corrigir a resistência do termistor com a fórmula correta
		// // const RT = (VRT * this.rSeries) / (this.voltageReference - VRT);
		// const RT = ((voltageReference - VRT) * rSeries) / VRT;

		// // Usar a equação de Steinhart-Hart (simplificada)
		// const tKelvin = 1 / (1 / (this.t0 + 273.15) + (1 / this.beta) * Math.log(RT / this.r0));
		// const tCelsius = tKelvin - 273.15;
		// return tCelsius;
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
