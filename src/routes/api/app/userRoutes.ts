import { Router } from "express";
import { userController } from "../../../controllers/userController";

const router = Router();

function asyncHandler(fn: any) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

router.post("/", asyncHandler(userController.create));
router.get("/", asyncHandler(userController.findAll));
router.get("/:id", asyncHandler(userController.findById));
router.put("/:id", asyncHandler(userController.update));
router.delete("/:id", asyncHandler(userController.delete));
router.post("/login", asyncHandler(userController.login));

export default router;