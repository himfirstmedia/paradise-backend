import { Router } from "express";
import { choreController } from "../../../controllers/choreController";
import { upload } from "middlewares/upload";
import { catchAsync } from "utils/catch_error";

const router = Router();

// --- Chore-specific routes ---
router.post("/", upload("chores").single("image"), catchAsync(choreController.create));
router.post("/:id/assign", catchAsync(choreController.assign));
router.get("/", catchAsync(choreController.findAll));
router.get("/house/:houseId", catchAsync(choreController.findByHouse));

// --- Summary route should be before any :id routes ---
router.get("/summary", catchAsync(choreController.getChoreSummary));


router.get("/:id/details", catchAsync(choreController.findDetailedById));
router.get("/:id", catchAsync(choreController.findById));
router.put("/:id", upload("chores").single("image"), catchAsync(choreController.update));
router.delete("/:id", catchAsync(choreController.delete));


export default router;
