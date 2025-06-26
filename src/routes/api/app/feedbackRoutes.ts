import { Router } from 'express';
import { feedbackController } from '../../../controllers/feedbackController';

const router = Router();
router.post('/', feedbackController.create);
router.get('/', feedbackController.findAll);
router.get('/:id', feedbackController.findById);
router.put('/:id', feedbackController.update);
router.delete('/:id', feedbackController.delete);

export default router;
