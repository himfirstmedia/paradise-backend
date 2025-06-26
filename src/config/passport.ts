import LocalStrategy from "passport-local";
import prisma from "./prisma";
import { isPasswordValid } from "utils/utils";
export const localStrategy = new LocalStrategy.Strategy(
  { usernameField: "email", passReqToCallback: false },
  async (email, password, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          email,
        },
      });
      if (user && !user.password) {
        return done(null, false, { message: "Please use the google login" });
      }
      if (!user || !isPasswordValid(password, user.password || "")) {
        return done(null, false, { message: "Invalid email or password" });
      }

      return done(null, user);
    } catch (err) {
      return done(null, false, { message: "Failed to authenticate user" });
    }
  }
);
