import { Router } from "express";
import { choreController } from "../../../controllers/choreController";
import { upload } from "middlewares/upload";
import { catchAsync } from "utils/catch_error";

const router = Router();

router.post("/", catchAsync(choreController.create));
router.get("/", catchAsync(choreController.findAll));
router.get("/:id", catchAsync(choreController.findById));
router.get("/house/:houseId", catchAsync(choreController.findByHouse));
router.get("/:id/details", catchAsync(choreController.findDetailedById));
router.put("/:id", catchAsync(choreController.update));
router.delete("/:id", catchAsync(choreController.delete));


export default router;