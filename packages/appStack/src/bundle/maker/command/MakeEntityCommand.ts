import { Str } from '../../../helper';
import { CommandInfo } from '../../cli';
import { AbstractMakeCommand } from './AbstractMakeCommand';

/**
 * Make a TypeORM Entity
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class MakeEntityCommand extends AbstractMakeCommand {

    description: string = "Make an TypeORM Entity";
    name: string = "make:entity <name>";

    configure(command: CommandInfo) {
        command.option('-d --dir <directory>', 'Controller directory', '/src/entity');
        command.option('-m --mongo', 'Mongo', false);
        command.option('-s --schema <schema>', 'Schema name (Postgres, MS Sql)');
    }

    async run(name: string, { mongo, dir, schema }: { mongo?: boolean, dir?: string, schema?: string }) {
        this.makeFile({
            type: 'Entity',
            name, dirName: dir,
            template: className => {
                let fullName = Str.pascalCase(name);
                if (mongo) {
return `import { Entity, ObjectIdColumn, Column, ObjectID } from 'typeorm';

@Entity()
export class ${fullName} {

    @ObjectIdColumn()
    public _id!: ObjectID

    @Column()
    public createdAt!: Date

}`;
                } else {
return `import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity(${ schema ? JSON.stringify({ schema }) : '' })
export class ${fullName} {

    @PrimaryGeneratedColumn()
    public id!: string

    @Column()
    public createdAt!: Date

}`;
                }
            }
        });
    }

}