import { Router } from "express";
import { ServerReanderingRoutes } from "./server_reandering.routes";
import userRoutes from "./api/app/userRoutes";
import houseRoutes from "./api/app/houseRoutes";
import taskRoutes from "./api/app/taskRoutes";
import feedbackRoutes from "./api/app/feedbackRoutes";
import scriptureRoutes from "./api/app/scriptureRoutes";

const app = Router();

app.use("/", ServerReanderingRoutes);
app.use("/api/houses", houseRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/scriptures", scriptureRoutes);

export { app as MainRouter };
