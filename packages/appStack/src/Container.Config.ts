import { Container } from '@azera/container';
import { LoggerFactory } from './factory/LoggerFactory';

export default function configureContainer(container: Container) {

    // Logger service
    if ( !container.has('logger') )
        container.set('logger', LoggerFactory);

}