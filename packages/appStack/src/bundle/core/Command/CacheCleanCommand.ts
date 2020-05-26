import { Command } from '../../cli/Command';
import { Container, Inject } from '@azera/container';
import { CacheManager } from '../../../cache';

/**
 * Find tagged services
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class CacheCleanCommand extends Command {

    name: string = 'cache:clean <provider> <pattern>';
    description: string = 'Remove cache by pattern from specified provider';

    async run( @Inject() container: Container, provider: string, pattern: string ) {

        let cacheManager = container.invoke(CacheManager);

        let count = await cacheManager.get(provider).delete(pattern);

        console.log(`${count} cached items removed from "${provider}" provider`);
    }
}