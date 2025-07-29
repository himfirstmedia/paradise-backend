import { Queue } from "bullmq";
import redisClient from "../../config/redis";

export const notificationQueue = new Queue("notificationQueue", {
  connection: redisClient,
});
