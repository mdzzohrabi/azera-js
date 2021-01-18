import * as microtime from 'microtime';

/**
 * Profiler
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class Profiler {

    public enabled: boolean = false;

    /**
     * If true stack trace will log along with profiles start
     */
    public logStackTrace = true;

    /** Profiles collection */
    public profiles: { [profileName: string]: Profile } = {};

    getStackTrace(ignores = 0) {
        let stack = new Error().stack?.split("\n");
        return stack?.splice(2 + ignores);
    }

    start(name: string, detail?: any) {
        if (!this.enabled) return;
        let timestamp = microtime.now();
        let profile = this.profiles[name] || ( this.profiles[name] = { name, times: [], lastOpenTime: -1, firstStart: timestamp } );
        let time: Profile['times'][0] = {
            start: timestamp,
            stack: this.logStackTrace ? this.getStackTrace(1) : undefined,
            detail
        };
        profile.times.push(time);
        profile.lastOpenTime++;

        return {
            end() {
                profile.lastOpenTime--;
                profile.lastEnd = time.end = microtime.now();
            }
        }
    }

    end(name: string) {
        if (!this.enabled) return;
        let profile = this.profiles[name];
        if (!profile) throw Error(`Profile ${name} not started`);
        profile.lastEnd = profile.times[ profile.times.length - 1 ].end = microtime.now();
    }

    withProfile<T>(name: string, action: () => T, detail?: any) {
        let profile = this.start(name, detail);
        let result = action();
        profile?.end();
        return result;
    }

    profileMethod<T extends { [name: string]: any }>(context: T, method: keyof T, profileName: string, detail?: (target: T, ...params: any[]) => any): void {
        let self = this;
        let base = context[method];
        let methodName = method + '$profile';
        context[method] = ({
            async [methodName](...params: any[]) {
                let profile = self.start(profileName, detail ? detail(this as any, ...params) : undefined );
                let result = await base.apply(this, params); 
                profile?.end();
                return result;
            }
        }[methodName]) as any;
    }

}

export interface Profile {
    name: string
    times: { start: number, end?: number, detail?: any, stack?: string[] }[]
    lastOpenTime: number
    firstStart: number
    lastEnd?: number
    duration?: number,
}