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
    abstract async run(...params: any[]): Promise<void>;

    /**
     * Configure command
     * @param command Command info
     */
    configure(command: CommandInfo) {

        command
            .version(this.version)
            .description(this.description)
        ;

    }

}