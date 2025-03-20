/**
 * Function to calculate the time required to heat water
 * @param volumeLiters - Volume of water in liters
 * @param powerWatts - Power in watts
 * @param initialTemperature - Initial temperature in degrees Celsius
 * @param finalTemperature - Final temperature in degrees Celsius
 * @returns Time required to heat water in seconds
 */
export function calculateHeatingTimeSeconds(
	volumeLiters: number,
	powerWatts: number,
	initialTemperature: number,
	finalTemperature: number,
): number {
	// Constants
	const specificHeatCapacity = 4186; // Specific heat capacity of water in J/kg°C

	// Convert volume to mass (1 liter of water = 1 kg)
	const massKg = volumeLiters;

	// Calculate the temperature change
	const deltaTemperature = finalTemperature - initialTemperature;

	// Calculate the amount of heat required (Q = m * c * ΔT)
	const heatRequired = massKg * specificHeatCapacity * deltaTemperature;

	// Calculate the time required (t = Q / P)
	const timeSeconds = heatRequired / powerWatts;

	return timeSeconds;
}

/**
 * Function to calculate the cooling constant k
 * @param T0 - Initial temperature
 * @param Tt - Temperature at time t
 * @param Tamb - Ambient temperature
 * @param t - Time in seconds
 * @returns Cooling constant k or -1 if inputs are invalid
 */
export function calculateCoolingConstant(T0: number, Tt: number, Tamb: number, t: number): number {
	// Validate inputs to avoid division by zero or invalid calculations
	if (Tt <= Tamb || T0 <= Tamb || t <= 0) {
		return -1; // Indicate an error
	}

	// Calculate the fraction
	const fraction = (Tt - Tamb) / (T0 - Tamb);
	if (fraction <= 0) {
		return -1; // Indicate an error
	}

	// Calculate the constant k
	const k = -Math.log(fraction) / t;

	return k;
}
