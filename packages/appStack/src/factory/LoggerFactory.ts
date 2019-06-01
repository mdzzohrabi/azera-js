import { createLogger, transports } from 'winston';
import { Inject, Container } from '@azera/container';

/**
 * Logger factory
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class LoggerFactory {

    create( @Inject() serviceContainer: Container ) {

        return createLogger({
            transports: [
                new transports.Console
            ],
            defaultMeta: serviceContainer.getParameter('logger.metas')
        })

    }

}