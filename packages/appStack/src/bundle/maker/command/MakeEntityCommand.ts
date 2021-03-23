import { Inject } from '@azera/container';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { Str } from '../../../helper';
import { Kernel } from '../../../kernel/Kernel';
import { Cli, Command, CommandInfo } from '../../cli';

/**
 * Make a TypeORM Entity
 */
export class MakeEntityCommand extends Command {

    description: string = "Make an TypeORM Entity";
    name: string = "make:entity <name>";

    configure(command: CommandInfo) {
        command.option('-d --dir <directory>', 'Controller directory', '/src/entity');
        command.option('-m --mongo', 'Mongo', false);
        command.option('-s --schema <schema>', 'Schema name (Postgres, MS Sql)');
    }

    @Inject() async run(kernel: Kernel, cli: Cli, name: string, { mongo, dir, schema }: { mongo?: boolean, dir?: string, schema?: string }): Promise<void> {

        let fullName = Str.humanize(name);
        dir = kernel.rootDir + ( dir ?? '/src/entity' );
        let file = dir + '/' + fullName + '.ts';

        if (existsSync(file)) {
            cli.error(`Entity file "${file}" already exists`);
            return;
        }

        // Ensure controller directory exists
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

        if (mongo) {
        writeFileSync(
            file,
`import { Entity, ObjectIdColumn, Column, ObjectID } from 'typeorm';

@Entity()
export class ${fullName} {

    @ObjectIdColumn()
    public _id!: ObjectID

    @Column()
    public createdAt!: Date

}
`);
        } else {
        writeFileSync(
            file,
`import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity(${ schema ? JSON.stringify({ schema }) : '' })
export class ${fullName} {

    @PrimaryGeneratedColumn()
    public id!: string

    @Column()
    public createdAt!: Date

}
`);
        }

        cli.success(`Entity ${fullName} successfuly created in ${file}`);

    }

}