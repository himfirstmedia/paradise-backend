import httpStatus from "http-status";
import express from "express";

import { config } from "./config/config";
import { errorConverter, errorHandler } from "./middlewares/errors";
import { engine } from "express-handlebars";
import path from "path";
import passport from "passport";
import session from "express-session";
import morgan from "./config/mogan";
import cors from "cors";
import helmet from "helmet";
import xss from "xss-clean";
import * as connectRedis from "connect-redis";
import compression from "compression";
import redisClient from "./config/redis";
import cookieParser from "cookie-parser";
import { ApiError } from "utils/api_error";
import { MainRouter } from "routes/mainRouter";
import { localStrategy } from "config/passport";
import prisma from "config/prisma";
const app = express();
const RedisStore = new connectRedis.RedisStore({
  client: redisClient,
  prefix: "sess:",
});

if (config.env !== "test") {
  app.use(morgan.errorHandler);
  app.use(morgan.successHandler);
}

app.set("trust proxy", 1);
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: config.authSecret || "your-secret-key",
    store: RedisStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.env != "development",
      httpOnly: true,
      sameSite: "lax",
    },
  })
);
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {},
    },
  })
);
app.use(xss());
app.use(compression());

const allowedOrigins = [
  'http://192.168.100.94:8081', 
  'http://localhost:8081',      
  '*',                         
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.options("*", cors());
app.use(passport.initialize());

app.engine("hbs", engine({ extname: ".hbs" }));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(
  express.static(path.join(__dirname, "../public"), {
    maxAge: config.env != "development" ? "30d" : "0",
  })
);
passport.use(localStrategy);
passport.serializeUser((user: any, done) => {
  done(null, user.id as any);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: Number(id),
      },
    });
    if (user) {
      return done(null, user);
    }
    return done(null, null);
  } catch (error) {
    done(error);
  }
});
app.use("/", MainRouter);
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, "Not found"));
});
app.use(errorConverter);
app.use(errorHandler);
export default app;
