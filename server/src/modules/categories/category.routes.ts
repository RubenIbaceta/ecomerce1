import { Router } from 'express';
import { listCategories } from './category.service.ts';

export const categoryRouter = Router();

categoryRouter.get('/', async (_request, response, next) => {
  try {
    response.json({ data: await listCategories() });
  } catch (error) {
    next(error);
  }
});
