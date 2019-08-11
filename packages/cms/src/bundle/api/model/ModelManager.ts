import { Model } from './Model';
import { ConnectionOptions } from 'typeorm';

export class ModelManager extends Map<string, Model> {

    constructor(models: Model[]) {
        super();
        (models || []).forEach(model => this.addModel(model));
    }

    addModel(model: Model) {
        this.set(model.name, model);
    }

    removeModel(model: Model) {
        this.delete(model.name);
    }

    reMap() {
        let models = [ ...this.entries() ]
        this.clear();
        models.forEach(([ key, model ]) => this.set(model.name, model));
    }

    buildConnectionEntities(connection: ConnectionOptions) {

    }

}