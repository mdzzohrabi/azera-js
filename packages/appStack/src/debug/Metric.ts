import { HashMap } from "@azera/util/is";
import { Str } from "../helper";
import microtime = require("microtime");

/**
 * Metrics provides a powerful toolkit of ways to measure the behavior of critical components in your production environment.
 * 
 * @author     Masoud Zohrabi <@mdzzohrabi>
 * @influence  https://metrics.dropwizard.io/
 */
export class Metric {

    public meters: HashMap<Meter> = {};
    public gauges: HashMap<Gauge<unknown>> = {};
    public histograms: HashMap<Histogram> = {};
    public timers: HashMap<Timer> = {};
    public counters: HashMap<Counter> = {};
    public healthChecks: HashMap<HealthCheck> = {};

    /**
     * A meter measures the rate of events over time (e.g., “requests per second”)
     * @param name Name of meter (e.g: http.requests)
     */
    meter(name: string) {
        return this.meters[name] ?? (this.meters[name] = new Meter(name));
    }

    /**
     * A gauge is an instantaneous measurement of a value. For example, we may want to measure the number of pending jobs in a queue
     * @param name Name of gauge (e.g: tasks.size)
     * @param valueGetter Value getter function
     */
    gauge<T>(name: string, valueGetter: () => T) {
        return this.gauges[name] ?? (this.gauges[name] = new Gauge(name, valueGetter));
    }

    /**
     * A counter is just a gauge for an AtomicLong instance. You can increment or decrement its value. For example, we may want a more efficient way of measuring the pending job in a queue
     * @param name Name of counter (e.g: tasks.pending)
     */
    counter(name: string) {
        return this.counters[name] ?? (this.counters[name] = new Counter(name));
    }

    /**
     * A histogram measures the statistical distribution of values in a stream of data. In addition to minimum, maximum, mean, etc.,
     * @param name Histogram name
     */
    histogram(name: string) {
        return this.histograms[name] ?? (this.histograms[name] = new Histogram(name));
    }

    /**
     * A timer measures both the rate that a particular piece of code is called and the distribution of its duration.
     * @param name Timer name
     */
    timer(name: string) {
        return this.timers[name] ?? (this.timers[name] = new Timer(name));
    }

    /**
     * Metrics also has the ability to centralize your service’s health checks
     * @param name Health check name
     */
    healthCheck(name: string, healthGetter?: (health: HealthCheck) => any) {
        return this.healthChecks[name] ?? (this.healthChecks[name] = new HealthCheck(name, healthGetter));
    }

    /**
     * Create metric reporter
     * @param writeStream Write stream to output reports
     * @param options Reporter options
     */
    createReporter(writeStream: { write: Function }, options: { interval?: number, convertToSeconds?: boolean, pattern?: string }) {
        let stopped = false;
        let { format } = Str;
        let { pattern = `[{type}] [{name}] {text}\n`, convertToSeconds = true, interval = 1000 } = options;
        let reporter = async () => {
            if (stopped) return;
            
            writeStream.write(`Metric Report on ${new Date()} :\n`);
            for (let [name, meter] of Object.entries(this.meters)) {
                writeStream.write(format(pattern, { type: 'Meter', name, text: `Hitted ${meter.hits} times with ${meter.speed} hit/s speed` }));
            }

            for (let [name, gauge] of Object.entries(this.gauges)) {
                writeStream.write(format(pattern, { type: 'Gauge', name, text: `Value is ${gauge.value}` }));
            }

            for (let [name, histogram] of Object.entries(this.histograms)) {
                writeStream.write(format(pattern, { type: 'Histogram', name, text: `Has ${histogram.size} data between ${histogram.minValue} - ${histogram.maxValue} with average ${histogram.averageValue}` }));
            }

            for (let [name, timer] of Object.entries(this.timers)) {
                writeStream.write(format(pattern, { type: 'Timer', name, text: `Called ${timer.hits} times, with average time ${timer.averageTime.toPrecision(1)}s between ${timer.minTime.toPrecision(1)}s - ${timer.maxTime.toPrecision(1)}s` }));
            }

            for (let [name, counter] of Object.entries(this.counters)) {
                writeStream.write(format(pattern, { type: 'Counter', name, text: `Value = ${counter.value}` }));
            }

            for (let [name, health] of Object.entries(this.healthChecks)) {
                await health.check();
                writeStream.write(format(pattern, { type: 'Health', name, text: `Status = ${health.healthStatus}${health.isHealthy ? '' : ' [Down]'}`}));
            }
        }
        let intervalId = setInterval(reporter, interval);
        return {
            stop() {
                stopped = true;
                clearInterval(intervalId);
            },

            start() {
                stopped = false;
                intervalId = setInterval(reporter, interval);
            }
        }
    }

}

abstract class AbstractMetric {
    constructor(public readonly name: string) {}
}

class Meter extends AbstractMetric {
    public hits: number = 0
    public lastHitTimeStamp: number = 0
    public speed: number = 0   // Hits per microseconds

    /**
     * Hit meter by one
     */
    hit() {
        this.hits += 1;
        let now = microtime.nowDouble();
        if (this.lastHitTimeStamp > 0) {
            this.speed = 1 / (now - this.lastHitTimeStamp);
        }
        this.lastHitTimeStamp = now;
    }
}

class Gauge<T> extends AbstractMetric {
    constructor(name: string, protected valueGetter: () => T) {
        super(name);
    }

    get value() {
        return this.valueGetter();
    }
}

class Histogram extends AbstractMetric {
    public readonly values: number[] = [];

    update(value: number) {
        this.values.push(value);
    }

    get size() {
        return this.values.length;
    }

    get maxValue() {
        return Math.max( ...this.values );
    }

    get minValue() {
        return Math.min( ...this.values );
    }

    get averageValue() {
        return this.values.reduce((p, c) => p + c, 0) / this.values.length;
    }
}

class Timer extends AbstractMetric {
    public readonly times: number[] = [];
    public hits: number = 0
    public lastHitTimeStamp: number = 0
    public speed: number = 0   // Hits per microseconds

    get maxTime() {
        return Math.max( ...this.times );
    }

    get minTime() {
        return Math.min( ...this.times );
    }

    get averageTime() {
        return this.times.reduce((p, c) => p + c) / this.times.length;
    }

    time<T>(action: () => T) {
        let time = microtime.nowDouble();
        let result = action();
        if (result instanceof Promise) {
            result.then(r => {
                let now = microtime.nowDouble();
                time = now - time;
                this.times.push(time);
                this.hits += 1;
                if (this.lastHitTimeStamp > 0) {
                    this.speed = 1 / (this.lastHitTimeStamp - now);
                }
                this.lastHitTimeStamp = now;        
                return r;
            });
        } else {
            let now = microtime.nowDouble();
            time = now - time;
            this.times.push(time);
            this.hits += 1;
            if (this.lastHitTimeStamp > 0) {
                this.speed = 1 / (this.lastHitTimeStamp - now);
            }
            this.lastHitTimeStamp = now;
        }
        return result;
    }
}

class Counter extends Gauge<number> {
    public numValue: number = 0;

    constructor(name: string) {
        super(name, () => this.numValue);
    }

    inc() {
        this.numValue++;
    }

    dec() {
        this.numValue--;
    }
}

class HealthCheck extends AbstractMetric {

    protected _healthStatus!: string;
    protected _isHealthy: boolean = false;

    constructor(name: string, protected healthGetter?: (health: HealthCheck) => any) {
        super(name);
    }

    check() {
        this.healthGetter?.call(this, this);
    }

    get isHealthy() {
        return this._isHealthy;
    }

    get healthStatus() {
        return this._healthStatus;
    }

    healthy(status: string = 'OK') {
        this._healthStatus = status;
        this._isHealthy = true;
    }

    unhealthy(message: string) {
        this._healthStatus = message;
        this._isHealthy = false;
    }
}