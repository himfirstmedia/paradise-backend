import Redis from "ioredis";
import { config } from "./config";

const redisClient = new Redis(config.redisUrl);
export default redisClient;
if (config.env != "development") {
  redisClient.del(["homeData"]);
}
