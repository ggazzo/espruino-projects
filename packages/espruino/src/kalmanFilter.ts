export class KalmanFilter {
	private errMeasure: number;
	private errEstimate: number;
	private q: number;
	private kalmanGain: number = 0;
	private currentEstimate: number = 0;
	private lastEstimate: number = 0;

	constructor(meaE: number, estE: number, q: number) {
		this.errMeasure = meaE;
		this.errEstimate = estE;
		this.q = q;
	}

	updateEstimate(mea: number): number {
		this.kalmanGain = this.errEstimate / (this.errEstimate + this.errMeasure);
		this.currentEstimate = this.lastEstimate + this.kalmanGain * (mea - this.lastEstimate);
		this.errEstimate =
			(1.0 - this.kalmanGain) * this.errEstimate +
			Math.abs(this.lastEstimate - this.currentEstimate) * this.q;
		this.lastEstimate = this.currentEstimate;
		return this.currentEstimate;
	}

	setMeasurementError(meaE: number): void {
		this.errMeasure = meaE;
	}

	setEstimateError(estE: number): void {
		this.errEstimate = estE;
	}

	setProcessNoise(q: number): void {
		this.q = q;
	}

	getKalmanGain(): number {
		return this.kalmanGain;
	}
}
