import { pins } from './definitions';
import { KalmanFilter } from './kalmanFilter';
import { Thermistor } from './thermistor';

const filter = new KalmanFilter(2, 2, 0.01);
const sensor = new Thermistor(pins.temperature);
export const readTemperature = () => {
	const temperature = sensor.getTemp();
	return temperature;
};
