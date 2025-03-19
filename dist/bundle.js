var pins = {
    temperature: 0,
    heater: 1,
    ledP: D13,
};

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

var FiniteStateMachine = (function () {
    function FiniteStateMachine(config) {
        this.config = config;
        this.context = __assign({}, config.context);
        this.currentState = config.initial;
        var initialState = this.config.states[this.currentState];
        if (initialState === null || initialState === void 0 ? void 0 : initialState.onEnter) {
            initialState.onEnter(this.context);
        }
    }
    FiniteStateMachine.prototype.processTransition = function (transition, context, event) {
        var currentStateConfig = this.config.states[this.currentState];
        if (transition.cond && !transition.cond(this.context, event)) {
            return this.currentState;
        }
        if (currentStateConfig.onExit) {
            currentStateConfig.onExit(this.context, event);
        }
        if (transition.actions) {
            transition.actions(this.context, event);
        }
        var previousState = this.currentState;
        this.currentState = transition.target;
        var nextStateConfig = this.config.states[this.currentState];
        if (nextStateConfig.onEnter) {
            nextStateConfig.onEnter(this.context, event);
        }
        console.log("Transition: ".concat(previousState, " -> ").concat(this.currentState, " (").concat(event.type, ")"));
        return this.currentState;
    };
    FiniteStateMachine.prototype.send = function (event) {
        var currentStateConfig = this.config.states[this.currentState];
        var transition = currentStateConfig.transitions[event.type];
        if (!transition) {
            console.warn("No transition found for event ".concat(event.type, " in state ").concat(this.currentState));
            return this.currentState;
        }
        if (Array.isArray(transition)) {
            for (var _i = 0, transition_1 = transition; _i < transition_1.length; _i++) {
                var t = transition_1[_i];
                this.processTransition(t, this.context, event);
            }
        }
    };
    FiniteStateMachine.prototype.getState = function () {
        return this.currentState;
    };
    FiniteStateMachine.prototype.getContext = function () {
        return __assign({}, this.context);
    };
    FiniteStateMachine.prototype.updateContext = function (contextUpdate) {
        this.context = __assign(__assign({}, this.context), contextUpdate);
    };
    FiniteStateMachine.prototype.matches = function (state) {
        return this.currentState === state;
    };
    return FiniteStateMachine;
}());

var heatingMachine = new FiniteStateMachine({
    initial: 'idle',
    context: {
        temperature: 0,
        counter_measurement: 0,
        output: 0,
    },
    states: {
        idle: {
            onEnter: function (context) {
                console.log('Entering idle state');
            },
            onExit: function (context) {
                console.log('Exiting idle state');
            },
            transitions: {
                READ_TEMPERATURE: [
                    {
                        target: 'idle',
                        actions: function (context, event) {
                            context.temperature = event.temperature;
                            console.log('Reading temperature', event.temperature);
                        },
                    },
                ],
                HEAT: {
                    target: 'heating',
                },
            },
        },
        heating: {
            onEnter: function (context, event) {
                console.log('Entering heating state');
            },
            onExit: function (context, event) {
                context.counter_measurement = 0;
            },
            transitions: {
                READ_TEMPERATURE: {
                    target: 'pid',
                    cond: function (context, event) { return context.counter_measurement++ > 10; },
                },
                STOP: {
                    target: 'idle',
                },
            },
        },
    },
});

var PID = (function () {
    function PID(controllerDirection, kp, ki, kd, setpoint, maxOutput, minOutput, pOn) {
        this.controllerDirection = controllerDirection;
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
        this.setpoint = setpoint;
        this.maxOutput = maxOutput;
        this.minOutput = minOutput;
        this.output = 0;
        this.integral = 0;
        this.lastInput = 0;
        this.setTunings(kp, ki, kd, pOn);
    }
    PID.prototype.setTunings = function (kp, ki, kd, pOn) {
        if (kp < 0 || ki < 0 || kd < 0 || pOn < 0 || pOn > 1)
            return;
        this.pOnE = pOn > 0;
        this.pOnM = pOn < 1;
        this.kp = this.controllerDirection ? kp : -kp;
        this.ki = this.controllerDirection ? ki : -ki;
        this.kd = this.controllerDirection ? kd : -kd;
        this.pOnEKp = pOn * this.kp;
        this.pOnMKp = (1 - pOn) * this.kp;
    };
    PID.prototype.compute = function (input, timeChange_sec) {
        var error = this.setpoint - input;
        var derivative = input - this.lastInput;
        this.integral += this.ki * error * timeChange_sec;
        if (this.pOnM)
            this.integral -= this.pOnMKp * derivative;
        this.integral = Math.max(this.minOutput, Math.min(this.maxOutput, this.integral));
        this.output = this.pOnEKp * error + this.integral - (this.kd * derivative) / timeChange_sec;
        this.lastInput = input;
        return this.output;
    };
    PID.prototype.setSetpoint = function (setpoint) {
        this.setpoint = setpoint;
    };
    return PID;
}());

var Thermistor = (function () {
    function Thermistor(pin, beta, r0, t0, rSeries, voltageReference) {
        if (beta === void 0) { beta = 3950; }
        if (r0 === void 0) { r0 = 10000; }
        if (t0 === void 0) { t0 = 25; }
        if (rSeries === void 0) { rSeries = 100000; }
        if (voltageReference === void 0) { voltageReference = 3.3; }
        this.beta = beta;
        this.r0 = r0;
        this.t0 = t0;
        this.rSeries = rSeries;
        this.voltageReference = voltageReference;
        this.pin = new Pin(pin);
    }
    Thermistor.prototype.readTemperature = function (pin, beta, r0, t0, rSeries, voltageReference) {
        if (voltageReference === void 0) { voltageReference = 3.3; }
        var adc = analogRead(pin);
        var v = adc * voltageReference;
        var rThermistor = rSeries * (v / (voltageReference - v));
        var tKelvin = 1 / (1 / (t0 + 273.15) + (1 / beta) * Math.log(rThermistor / r0));
        var tCelsius = tKelvin - 273.15;
        return tCelsius;
    };
    Thermistor.prototype.getTemp = function () {
        return this.readTemperature(this.pin, this.beta, this.r0, this.t0, this.rSeries, this.voltageReference);
    };
    return Thermistor;
}());

new PID(true, 0.1, 0.01, 0.001, 0, 255, 0, 1);
new Thermistor(pins.temperature);
new Pin(pins.heater);
setInterval(function () {
    console.log('AAAAA', heatingMachine.send({
        type: 'READ_TEMPERATURE',
        temperature: Math.random() * 100,
    }));
}, 100);
setInterval(function () {
    console.log('BBBBB', heatingMachine.getContext());
}, 1000);
