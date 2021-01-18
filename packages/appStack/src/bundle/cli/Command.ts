import * as commander from 'commander';

export interface CommandInfo extends commander.Command {}

/**
 * Abstract command-line command
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export abstract class Command {

    version: string = '1.0.0';

    /** Command description */
    abstract description: string;

    /** Command name */
    abstract name: string;

    /** Execute command */
    abstract run(...params: any[]): Promise<void>;

    /**
     * Configure command
     * @param command Command info
     */
    configure(...params: unknown[]): void
    configure(command: CommandInfo): void
    {
        command
            .version(this.version)
            .description(this.description)
        ;
    }

}