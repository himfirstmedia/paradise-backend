import { Router } from "express";
import { houseController } from "../../../controllers/houseController";

const router = Router();
router.post("/", houseController.create);
router.get("/", houseController.findAll);
router.get("/:id", houseController.findById);
router.put("/:id", houseController.update);
router.delete("/:id", houseController.delete);

export default router;
