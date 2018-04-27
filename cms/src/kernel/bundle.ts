export interface IBundle {
    register();
    boot();
}

export abstract class Bundle implements IBundle {

    register() {
        
    }

    boot() {
        
    }

}