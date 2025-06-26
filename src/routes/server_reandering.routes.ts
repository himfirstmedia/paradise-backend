import { Router } from "express";
import passport from "passport";
import { encriptPassword } from "utils/utils";

const app = Router();
app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/");
    return;
  }
  res.render("login", {
    error: req.session.messages?.join(", "),
  });
  req.session.messages = [];
});

app.post("/signin", (req, res, next) => {
  const callbackUrl = req.query.callbackUrl || "/";

  passport.authenticate(
    "local",
    (
      err: Error | null,
      user: Express.User | false,
      info: { message?: string }
    ) => {
      console.log(encriptPassword("12345"));

      if (err) {
        return next(err);
      }
      if (!user) {
        req.session.messages = [info.message || "Invalid email or password"];
        return res.redirect(
          `/login?callbackUrl=${encodeURIComponent(callbackUrl as string)}`
        );
      }

      req.logIn(user, (loginErr: Error) => {
        if (loginErr) {
          return next(loginErr);
        }

        return res.redirect(callbackUrl as string);
      });
    }
  )(req, res, next);
});
app.get("/", (req, res) => {
  if (!req.isAuthenticated()) {
    res.redirect("/login");
    return;
  }
  res.send("good");
});
export { app as ServerReanderingRoutes };
