import { Router } from "express";
import { taskController } from "../../../controllers/taskController";

const router = Router();

function asyncHandler(fn: any) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

router.post("/", asyncHandler(taskController.create));
router.get("/", asyncHandler(taskController.findAll));
router.get("/:id", asyncHandler(taskController.findById));
router.put("/:id", asyncHandler(taskController.update));
router.delete("/:id", asyncHandler(taskController.delete));

export default router;