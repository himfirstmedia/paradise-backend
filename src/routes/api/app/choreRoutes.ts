import { Router } from "express";
import { choreController } from "../../../controllers/choreController";
import { upload } from "middlewares/upload";

const router = Router();

function asyncHandler(fn: any) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

router.post("/", asyncHandler(choreController.create));
router.get("/", asyncHandler(choreController.findAll));
router.get("/:id", asyncHandler(choreController.findById));
router.get("/house/:houseId", asyncHandler(choreController.findByHouse));
router.get("/:id/details", asyncHandler(choreController.findDetailedById));
router.put("/:id", asyncHandler(choreController.update));
router.delete("/:id", asyncHandler(choreController.delete));


export default router;