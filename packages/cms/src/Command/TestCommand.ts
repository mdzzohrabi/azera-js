import { Cli, Command, EntityManager, Inject } from '@azera/stack';
import { Project } from '../entity/Project';

export class TestCommand extends Command {
    
    description: string = 'development test codes';
    name: string = 'test';

    @Inject() async run(em: EntityManager, cli: Cli) {
        cli.print("Test codes");
        cli.print(await em.find(Project, { relations: ['Configs'] }));
    }
}