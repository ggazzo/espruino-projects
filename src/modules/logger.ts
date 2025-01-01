export default class Logger {
	start() {
		setInterval(() => {
			console.log('tick');
		}, 1000);
	}
}
