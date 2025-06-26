import { Router } from "express";
import { taskController } from "../../../controllers/taskController";

const router = Router();
router.post("/", taskController.create);
router.get("/", taskController.findAll);
router.get("/:id", taskController.findById);
router.put("/:id", (req, res, next) => {
  Promise.resolve(taskController.update(req, res)).catch(next);
});
router.delete("/:id", taskController.delete);

export default router;
