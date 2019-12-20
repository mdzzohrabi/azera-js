import { createDecorator, createMetaDecorator } from '../../Metadata';

/**
 * Template annotation
 * 
 * Set template for an action
 */
export const Template = createMetaDecorator<string>('http:template', false, false);

/**
 * Header annotation
 * 
 * Set header item for a controller or an action
 */
export const Header = createDecorator((key: string, value: string) => ({ key, value }), 'http:header', true);