import { ok, strictEqual } from "assert";
import { wait } from "@azera/util";
import { Metric } from "../src/debug/Metric";
import { expect } from "chai";

describe('Metric', () => {

    let metric: Metric;

    beforeEach(() => metric = new Metric);

    it('Meter', async () => {
        let meter = metric.meter('requests');
        meter.hit();
        await wait(50);
        meter.hit();
        
        strictEqual(meter.hits, 2);
        strictEqual(meter.name, 'requests');
        ok(meter.lastHitTimeStamp > 0, 'Last Meter time stamp must be greater than zero');
        ok( meter.speed > 15 && meter.speed < 25, `Meter speed must be approximately to 20 not ${meter.speed}`);
    });

    it('Gauge', async () => {
        let pendings = 0;
        let gauge = metric.gauge('tasks.pending', () => pendings);

        strictEqual(gauge.value, 0);
        pendings = 1;
        strictEqual(gauge.value, 1);
        strictEqual(gauge.name, 'tasks.pending');
    });

    it('Counter', async () => {
        let counter = metric.counter('tasks.pending');

        strictEqual(counter.value, 0);  counter.inc();
        strictEqual(counter.value, 1);  counter.dec();
        strictEqual(counter.value, 0);
    });

    it('Histogram', async () => {
        let histogram = metric.histogram('response.size');

        strictEqual(histogram.minValue, Infinity);
        strictEqual(histogram.maxValue, -Infinity);
        strictEqual(histogram.averageValue, NaN);
        histogram.update(10);
        strictEqual(histogram.minValue, 10);
        strictEqual(histogram.maxValue, 10);
        strictEqual(histogram.averageValue, 10);
        histogram.update(20);
        strictEqual(histogram.minValue, 10);
        strictEqual(histogram.maxValue, 20);
        strictEqual(histogram.averageValue, 15);

        strictEqual(histogram.size, 2);
    });

    it('Timer', async () => {
        let timer = metric.timer('user.get');

        strictEqual(timer.hits, 0);
        await timer.time(() => wait(50));
        strictEqual(timer.hits, 1);
        expect( (timer.minTime / 1000) % 50 ).below( 5 , 'Timer captures must be approximately 50ms' );
    });
    
    it('HealthCheck', async () => {
        let i = 0;
        let health = metric.healthCheck('db', health => {
            if (i++ == 0) health.healthy();
            else health.unhealthy(`Fail to connect`);
        });

        health.check();
        strictEqual(health.healthStatus, 'OK');
        health.check();
        strictEqual(health.healthStatus, 'Fail to connect');

    });

    it('createReporter()', (done) => {
        let stream = {
            buffer: '',
            write(data: any) { this.buffer += data; }
        };

        metric.meter('http.requests').hit();
        metric.meter('http.requests').hit();
        metric.gauge('queue.size', () => 20);
        metric.healthCheck('database', health => health.healthy());
        metric.timer('hello.invoke').time(() => 'Hello');
        metric.timer('hello.invoke').time(() => 'Hello 2');

        let reporter = metric.createReporter(stream, { interval: 1 });
        
        setTimeout(() => {
            reporter.stop();
            ok(stream.buffer.includes(`http.requests`));
            ok(stream.buffer.includes(`queue.size`));
            ok(stream.buffer.includes(`database`));
            ok(stream.buffer.includes(`hello.invoke`));
            done();
        }, 5);
    });
});