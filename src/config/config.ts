import joi from "joi";
import dotenv from "dotenv";
dotenv.config();
const configData = joi
  .object()
  .keys({
    PORT: joi.string().default(6536),
    NODE_ENV: joi.string(),
    SECRET_KEY: joi.string(),
    REDIS_URL: joi.string(),
    CORS_ORIGIN: joi.string(),
  })
  .unknown();
const { value: envVars, error } = configData
  .prefs({ errors: { label: "key" } })
  .validate(process.env);
if (error) {
  throw new Error(`Config error ${error}`);
}
export const config = {
  port: envVars.PORT,
  env: envVars.NODE_ENV,
  authSecret: envVars.SECRET_KEY,
  redisUrl: envVars.REDIS_URL,
  corsOrigin: envVars.CORS_ORIGIN,
};