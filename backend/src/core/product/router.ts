import { Router } from 'express';
import { ProductQuerySchema, CompareQuerySchema } from './schemas';
import * as productService from './service';
import { AppError } from '../../common/errors';

export const productRouter = Router();

// GET /api/products
productRouter.get('/', async (req, res, next) => {
  try {
    const query = ProductQuerySchema.parse(req.query);
    const records = await productService.listProducts(query);
    // Strip internal fields for HTTP response
    const dtos = records.map((r) => {
      const { indicativeRate, processingFeeMax, ...dto } = r;
      return dto;
    });
    res.json(dtos);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/compare?ids=PL-101,PL-102
productRouter.get('/compare', async (req, res, next) => {
  try {
    const { ids } = CompareQuerySchema.parse(req.query);
    const products = await productService.compareProducts(ids);
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:productId
productRouter.get('/:productId', async (req, res, next) => {
  try {
    const record = await productService.getProduct(req.params.productId);
    if (!record) {
      throw new AppError(404, 'NOT_FOUND', `Product ${req.params.productId} not found`);
    }
    const { indicativeRate, processingFeeMax, ...dto } = record;
    res.json(dto);
  } catch (err) {
    next(err);
  }
});
