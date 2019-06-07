/**
 * Profiler
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class Profiler {

    /** Profiles collection */
    public profiles: { [profileName: string]: Profile } = {};

    start(name: string) {
        let timestamp = Date.now();
        let profile = this.profiles[name] || ( this.profiles[name] = { name, times: [], lastOpenTime: -1, firstStart: timestamp } );
        profile.times.push({ start: timestamp });
        profile.lastOpenTime++;
    }

    end(name: string) {
        let timestamp = Date.now();
        let profile = this.profiles[name];
        if (!profile) throw Error(`Profile ${name} not started`);
        profile.times[ profile.lastOpenTime-- ].end = timestamp;
        profile.lastEnd = timestamp;
    }

}


export interface Profile {
    name: string
    times: { start: number, end?: number }[]
    lastOpenTime: number
    firstStart: number
    lastEnd?: number
}