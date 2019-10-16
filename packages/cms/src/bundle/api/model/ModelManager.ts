import { ISerializable } from '../../../Serializer';
import { Model } from './Model';

export class ModelManager extends Map<string, Model> implements ISerializable {

    constructor(models: Model[] = []) {
        super();
        (models || []).forEach(model => this.addModel(model));
    }

    addModel(model: Model) {
        if (this.has(model.name)) {
            throw Error(`Model ${model.name} already exists in ModelManager`);
        }

        this.set(model.name, model);
    }

    get(modelName: string) {
        if (!this.has(modelName)) throw Error(`Model ${modelName} not found`);
        return super.get(modelName);
    }

    removeModel(model: Model) {
        this.delete(model.name);
    }

    refreshNames() {
        let models = [ ...this.entries() ]
        this.clear();
        models.forEach(([ key, model ]) => this.set(model.name, model));
    }

    toArray() {
        return [ ...this.entries() ].map(([name, model]) => model);
    }

    serialize() {
        return this.toArray();
    }
   
    unserialize(data: any): void {
        throw new Error("Method not implemented.");
    }
}