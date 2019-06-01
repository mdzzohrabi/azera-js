import { Logger as BaseLogger } from 'winston';
import { Inject } from '@azera/container';

/**
 * Application Logger
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class Logger {

    constructor(
        @Inject('logger') public service: BaseLogger
    ) {}

    /**
     * Info
     * @param message Message
     * @param meta Meta-data
     */
    info(message: string, ...meta: any[]) {
        this.service.info(message, ...meta);
    }

    /**
     * Debug
     * @param message Message
     * @param meta Meta-data
     */
    debug(message: string, ...meta: any[]) {
        this.service.debug(message, meta);
    }

    /**
     * Error
     * @param message Message
     * @param meta Meta-data
     */
    error(message: string, ...meta: any[]) {
        this.service.error(message, ...meta);
    }

    /**
     * Notice
     * @param message Message
     * @param meta Meta-data
     */
    notice(message: string, ...meta: any[]) {
        this.service.notice(message, ...meta);
    }

    /**
     * Log
     * @param level Log level
     * @param message Message
     * @param meta Meta-data
     */
    log(level: 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly' | string, message: string, ...meta: any[]) {
        this.service.log(level, message, ...meta);
    }

}