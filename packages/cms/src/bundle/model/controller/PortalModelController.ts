import { Controller, Inject, Middleware, Request, Response, NextFn } from '@azera/stack';
import { body as check, validationResult } from 'express-validator';
import { ModelManager } from '../ModelManager';

/**
 * Model api controller for portal bundle
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
@Controller('/api/models')
export class PortalModelController {

    /**
     * Validation errors checker middleware
     */
    static validate(req: Request, res: Response, next: Function) {
        let errors = validationResult(req);      
        if (!errors.isEmpty()) {
            res.status(422).json(errors.array());
        } else {
            next();
        }
    }

    /**
     * Models list
     * @api
     */
    ['GET /'](@Inject() models: ModelManager) {
        return models.toArray();
    }
    
    /**
     * Update an Model
     * @api
     */
    @Middleware([
        check('name')
            .not().isEmpty().withMessage('Model name is required')
            .isString().withMessage('Model name must be an string')
            .trim(),
        check('description')
            .isString().optional(),
        PortalModelController.validate
    ])
    ['PUT /'](
        @Inject() models: ModelManager,
        @Inject() req: Request,
        @Inject() next: NextFn)
    {
        let model = models.get(req.body.name);
        if (!model) return next(Error(`Model ${req.body.name} not found`));

        if (model.lock) {
            return next(Error(`Model ${model.name} is locked and cannot be modified`));
        }

        models.set(req.body.name, {
            ...model,
            description: req.body.description || model.description
        });

        return {
            message: 'Model changed succesfull',
            ok: true
        };
    }   
}