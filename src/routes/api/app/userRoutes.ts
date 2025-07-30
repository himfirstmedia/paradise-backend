import { Router } from "express";
import { userController } from "../../../controllers/userController";
import { sendPush } from "../../../services/notificationService"; // <-- Import the real sendPush

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

// Test push notification route
router.post(
  "/test-token",
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ message: "Token is required" });
      return;
    }

    await sendPush({
      to: token,
      title: "Test Notification",
      body: "This is a test push notification.",
      data: { test: true },
    });
    res.status(200).json({ message: "Test notification sent" });
  })
);

export default router;