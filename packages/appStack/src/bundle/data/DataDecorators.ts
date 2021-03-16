import { createDecorator } from '../../decorator/Metadata';

export const DataModel = createDecorator((options: { collectionName?: string } = {}) => options, 'data:model', false);

export const DataField = createDecorator((field: { required?: boolean, type?: string, size?: number, validator?: RegExp | ((value: any) => boolean), default?: any } = {}) => field, 'model:field', false);