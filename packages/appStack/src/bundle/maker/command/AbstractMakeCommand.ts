import { Inject } from '@azera/container';
import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { Str } from '../../../helper';
import { Kernel } from '../../../kernel/Kernel';
import { Cli, Command } from '../../cli';

/**
 * Abstract Make Command
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export abstract class AbstractMakeCommand extends Command {

    @Inject() kernel!: Kernel
    @Inject() cli!: Cli

    protected makeFile({ type, name, template, dirName, backupConfiguration = true }: {
        /** File type (e.g: Controller) */
        type: string,
        /** File name */
        name: string,
        /** File template */
        template: (className: string) => string,
        /** File directory name (optional) */
        dirName?: string,
        /** Backup config.json */
        backupConfiguration?: boolean
    }) {
        dirName = dirName ?? '/src/' + Str.dasherize(type);
        let fullName = Str.pascalCase(name) + Str.pascalCase(type);
        let fullDirPath = this.kernel.rootDir + dirName;
        let filePath = fullDirPath + '/' + fullName + '.ts';

        if (existsSync(filePath)) {
            this.cli.error(`${Str.humanize(type)} file "${filePath}" already exists`);
            return;
        }

        // Ensure controller directory exists
        if (!existsSync(fullDirPath)) mkdirSync(fullDirPath, { recursive: true });

        writeFileSync(filePath, template(fullName));

        // Prepare application configuration file
        if (this.kernel.container.hasParameter(Kernel.DI_PARAM_CONFIG_FILE)) {
            let configFile = this.kernel.resolvePath( this.kernel.container.getParameter<string>(Kernel.DI_PARAM_CONFIG_FILE) );

            if (configFile.endsWith('.json') && existsSync(configFile)) {

                // Make backup
                if (backupConfiguration) {
                    if (existsSync(configFile + '__backup')) unlinkSync(configFile + '__backup');
                    copyFileSync(configFile, configFile + '__backup');
                }
                
                let config = JSON.parse(readFileSync(configFile).toString());
                if (config.services) {
                    config.services.push( (dirName?.replace('src/', '') ?? '') + `/${fullName}` );
                } else {
                    config.services = [ (dirName?.replace('src/', '') ?? '') + `/${fullName}` ];
                }
                writeFileSync(configFile, JSON.stringify(config, null, "\t"));
            } else {
                this.cli.warning(`Configuration file %s not found`, configFile);
            }

        }

        this.cli.success(`${Str.humanize(type)} ${fullName} successfuly created in ${filePath}`);
    }
}