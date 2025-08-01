import { Router } from "express";
import { userController } from "../../../controllers/userController";
import { sendPush } from "../../../services/notificationService";
import saveToken from "controllers/fcmController";

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
router.get("/verify-password/:id", asyncHandler(userController.verifyPassword));
router.post("/validate-push-token", asyncHandler(userController.validateToken)); 
router.post("/save-token", saveToken);



export default router;