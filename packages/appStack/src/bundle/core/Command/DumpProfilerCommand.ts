import { Inject, Container } from '@azera/container';
import { Kernel } from '../../../kernel/Kernel';
import { Command, CommandInfo } from '../../cli/Command';
import { Cli } from '../../cli/Cli';
import { forEach } from '@azera/util';
import { existsSync, readFileSync } from 'fs';
import { Profile } from '../../../debug/Profiler';

/**
 * Dump profiles
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class DumpProfilerCommand extends Command {
    
    description: string = 'Dump profiler';
    name: string = 'profiler [name]';
    
    @Inject() async run( container: Container, cli: Cli, profileName: string ) {
        setImmediate(() => {


        let profiles!: Profile[];

        if (!profileName) {
            profiles = Object.values(container.invoke(Kernel).profiler.profiles);
        } else {
            if (!existsSync(profileName)) {
                throw Error(`Profile ${profileName} not found`);
            }

            try {
                profiles = Object.values(JSON.parse(readFileSync(profileName).toString('utf8')));
            } catch (e) {
                throw Error(`Given file is not a valid profiler output`);
            }
        }

        cli
            .print(`Profiles : ${ profileName || 'Current run' }`)
            .startTable({ borderHorizontal: '─' })
            .row('Name', 'Times', 'Duration (µs)', 'Percent (%)', 'Timeline');

        forEach(profiles, profile => {
            profile.duration = profile.times.map(t => t.end ? t.end - t.start : 0).reduce((p, c) => p + c);
        });

        let max = profiles.find((value, index, arr) => !arr.find(a => a.duration! > value.duration!))?.duration;
        let startTime = profiles.find(profile => !profiles.find(a => a.firstStart < profile.firstStart))?.firstStart;
        let endTime = profiles.find(profile => !profiles.find(a => a.lastEnd! > profile.lastEnd!))?.lastEnd;


        let timeLineScale = 50;
        let timeLineLength = endTime! - startTime!;

        let TimeLineTheme = {
            Bg: '-',
            Line: '▬',
            Start: '►',
            End: '◄',
        }

        forEach(profiles, profile => {          
            let tlStart = Math.round((profile.firstStart - startTime!) * timeLineScale / timeLineLength);
            let tlEnd = Math.round((profile.lastEnd! - startTime!) * timeLineScale / timeLineLength);

            let totalTimeLine = TimeLineTheme.Bg.repeat(tlStart) + '<green>' + TimeLineTheme.Start + TimeLineTheme.Line.repeat(tlEnd-tlStart) + TimeLineTheme.End + '</green>' + TimeLineTheme.Bg.repeat(timeLineScale-tlEnd);
            
            cli.row(
                profile.name,
                profile.times.length,
                profile.duration ? `${profile.duration} µs (${profile.duration / 1000} ms)` : 'Open',
                max ? (profile.duration! * 100 / max).toFixed(2) + '%' : '-',
                totalTimeLine
            );
        });

        cli.endTable();

        cli.print(`First profile time ${ startTime ? new Date(startTime / 1000).toLocaleString() : '-' } and last profile time is ${ endTime ? new Date(endTime / 1000).toLocaleString() : '-' }`)
    })
}

    configure(command: CommandInfo) {
        super.configure(command);
        command.option('-v, --visual', 'Visualize profiles');
    }

}