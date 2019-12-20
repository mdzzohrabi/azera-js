import { Container, Logger } from '@azera/stack';

export function FunctionController(serviceContainer: Container) {
    let logger = serviceContainer.invoke(Logger);
    logger.info('Functional controller');
    return 'Hello World';
}