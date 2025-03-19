export class PID {
	private pOnM: boolean;
	private pOnE: boolean;
	private pOnEKp: number;
	private pOnMKp: number;

	private output: number = 0;
	private integral: number = 0;
	private lastInput: number = 0;

	constructor(
		private controllerDirection: boolean,
		private kp: number,
		private ki: number,
		private kd: number,
		private setpoint: number,
		private maxOutput: number,
		private minOutput: number,
		pOn: number,
	) {
		this.setTunings(kp, ki, kd, pOn);
	}

	setTunings(kp: number, ki: number, kd: number, pOn: number): void {
		if (kp < 0 || ki < 0 || kd < 0 || pOn < 0 || pOn > 1) return;

		this.pOnE = pOn > 0; // some p on error is desired
		this.pOnM = pOn < 1; // some p on measurement is desired

		this.kp = this.controllerDirection ? kp : -kp;
		this.ki = this.controllerDirection ? ki : -ki;
		this.kd = this.controllerDirection ? kd : -kd;

		this.pOnEKp = pOn * this.kp;
		this.pOnMKp = (1 - pOn) * this.kp;
	}

	compute(input: number, timeChange_sec: number): number {
		const now = Date.now();

		const error = this.setpoint - input;
		const derivative = input - this.lastInput;

		this.integral += this.ki * error * timeChange_sec;

		if (this.pOnM) this.integral -= this.pOnMKp * derivative;

		// constrain
		this.integral = Math.max(this.minOutput, Math.min(this.maxOutput, this.integral));
		this.output = this.pOnEKp * error + this.integral - (this.kd * derivative) / timeChange_sec;

		this.lastInput = input;

		return this.output;
	}

	setSetpoint(setpoint: number): void {
		this.setpoint = setpoint;
	}
}
