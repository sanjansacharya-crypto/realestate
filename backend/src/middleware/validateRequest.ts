import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodEffects, ZodError, ZodTypeAny } from 'zod';
import { ValidationError } from '../common/errors/appError';

type ValidatableSchema = AnyZodObject | ZodEffects<ZodTypeAny>;

export const validateBody = (schema: ValidatableSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new ValidationError('Invalid request payload', formattedErrors));
      } else {
        next(error);
      }
    }
  };
};
