import { Emitter } from '@tspruino/emitter';

var wifi = require('Wifi');

var WIFI_NAME = 'GZ_';

var WIFI_OPTIONS = {
	password: 'Gz090491',
};

print('connecting...');

setTimeout(() => {
	// Connect to WiFi
	wifi.connect(WIFI_NAME, WIFI_OPTIONS, err => {
		if (err !== null) {
			console.log('Error connecting to WiFi:', err);
			throw err;
		}
		// Print IP address
		wifi.getIP((err, info) => {
			if (err !== null) {
				console.log('Error getting IP address:', err);
				throw err;
			}
			print('http://' + info.ip);
		});

		startServer();
	});
}, 1000);

// Create and start server
function startServer() {
	const s = require('ws').createServer(pageHandler);

	s.on('websocket', function wsHandler(ws) {
		ws.on('message', msg => {
			if (msg === 'up') {
				ee.emit('direction', 1);
			} else if (msg === 'down') {
				ee.emit('direction', -1);
			}
			if (msg === 'press') {
				ee.emit('press');
			}
		});
	});
	s.listen(80);
}

// Page request handler
function pageHandler(req, res) {
	res.writeHead(200, {
		'Content-Type': 'text/html',
	});
	res.end(`<html>
<head>
<script>
window.onload = () => {
  var ws = new WebSocket('ws://' + location.host, 'protocolOne');
  const form = document.getElementById('form');
  
  form.onsubmit = function (e) {
    e.preventDefault();
    const data = new FormData(form);
    const value = data.get('submit');
    ws.send(value);
    return false;
  };

};

</script>
</head>
<body>
<form id="form">
  <p>
    LED on:
    <input type="submit" value="up" /> 
    <input type="submit" value="down" /> 
    <input type="submit" value="press" />
  </p>
</form>
</body>
</html>`);
}
export const ee = new Emitter<{
	direction: 1 | -1;
	press: void;
}>();
