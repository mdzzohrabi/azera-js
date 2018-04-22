import { Container, Inject } from "@azera/container";

export abstract class Controller {
    
    @Inject('serviceContainer') container: Container;

}