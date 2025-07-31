import { Router } from "express";
import { taskController } from "../../../controllers/taskController";
import { upload } from "middlewares/upload";
import { catchAsync } from "utils/catch_error";

const router = Router();


router.post("/", catchAsync(taskController.create));
router.get("/summary", catchAsync(taskController.getTaskSummary)); 
router.get("/", catchAsync(taskController.findAll));
router.get("/:id", catchAsync(taskController.findById)); 
router.put("/:id", upload("tasks").single("image"), catchAsync(taskController.update));
router.delete("/:id", catchAsync(taskController.delete));


export default router;