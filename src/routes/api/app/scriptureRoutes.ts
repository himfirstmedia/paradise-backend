import { Router } from 'express';
import { scriptureController } from '../../../controllers/scriptureController';

const router = Router();
router.post('/', scriptureController.create);
router.get('/', scriptureController.findAll);
router.get('/:id', scriptureController.findById);
router.put('/:id', scriptureController.update);
router.delete('/:id', scriptureController.delete);

export default router;
