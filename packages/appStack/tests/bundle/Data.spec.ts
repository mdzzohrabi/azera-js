import { DataModel, DataField } from "../../src/bundle/data/DataDecorators";
import { DataManager } from '../../src/bundle/data/DataManager';

describe('DataBundle', () => {

    it('DataManager', () => {
    
        @DataModel()
        class User {
            @DataField() firstName!: string;
        }

        let manager = new DataManager();
            
        manager.newConnection('main', `memory://test:hello#123#@localhost:27017/expo`);
        manager.addModel(`main`, User);

    });

});