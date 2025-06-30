import { Router } from "express";
import { ServerReanderingRoutes } from "./server_reandering.routes";
import userRoutes from "./api/app/userRoutes";
import houseRoutes from "./api/app/houseRoutes";
import taskRoutes from "./api/app/taskRoutes";
import feedbackRoutes from "./api/app/feedbackRoutes";
import scriptureRoutes from "./api/app/scriptureRoutes";

const app = Router();

const apiRouter = Router();

app.use("/api/v1", apiRouter);

apiRouter.use("/houses", houseRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/tasks", taskRoutes);
apiRouter.use("/feedback", feedbackRoutes);
apiRouter.use("/scriptures", scriptureRoutes);

app.use("/", ServerReanderingRoutes);



export { app as MainRouter };
