declare module 'Thermistor' {
	/* Type definitions for thermistor module */

	/**
	 * Represents a thermistor sensor.
	 */
	class Thermistor {
		/**
		 * Creates an instance of a thermistor.
		 * @param pin The pin to which the thermistor is connected.
		 * @param characteristic The characteristic type of the thermistor.
		 */
		constructor(pin: number, characteristic: string);

		/**
		 * Reads the input and calculates the temperature.
		 * @returns The temperature in Celsius.
		 */
		getTemp(): number;
	}

	/**
	 * Connects to a thermistor sensor.
	 * @param pin The pin to which the thermistor is connected.
	 * @param type The characteristic type of the thermistor.
	 * @returns A Thermistor instance.
	 */
	function connect(pin: number, type: string): Thermistor;

	export { Thermistor, connect };
}
