import { Router } from "express";
import { houseController } from "../../../controllers/houseController";
import { catchAsync } from "utils/catch_error";

const router = Router();

router.post("/", catchAsync(houseController.create));
router.get("/", catchAsync(houseController.findAll));
router.get("/:id", catchAsync(houseController.findById));
router.put("/:id", catchAsync(houseController.update));
router.delete("/:id", catchAsync(houseController.delete));

export default router;
