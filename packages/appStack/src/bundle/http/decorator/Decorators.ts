import * as fileUploader from 'express-fileupload';
import { createDecorator, createMetaDecorator } from '../../../decorator/Metadata';
import { Middleware } from './Middleware';

/**
 * Template annotation
 * s
 * Set template for an action
 */
export const Template = createMetaDecorator<string, false>('http:template', false, false);

/**
 * Header annotation
 * 
 * Set header item for a controller or an action
 */
export const Header = createDecorator((key: string, value: string) => ({ key, value }), 'http:header', true);


/**
 * File upload middleware
 * @param options File upload options
 */
export function HttpFileUpload(options?: fileUploader.Options) {
    return Middleware([
        fileUploader(options)
    ])
}