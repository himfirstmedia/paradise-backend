import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary"; // Your config file

export const upload = (type: "chats" | "tasks") => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: `paradise/${type}`,
      allowed_formats: ["jpg", "jpeg", "png", "gif"],
      public_id: `${type}-image-${Date.now()}`,
    }),
  });

  return multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 5MB limit
  });
};