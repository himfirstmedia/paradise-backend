import prisma from "config/prisma";
import { sendExpoNotification } from "services/notification";
import { catchAsync } from "utils/catch_error";

const saveToken = catchAsync(async (req, res) => {
  console.log(req.body.body);
  
  const { token, userId } = JSON.parse(req.body.body);
  if (!token || !userId) {
    throw new Error("No token");
  }
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (user.expoPushToken == token) {
    res.sendStatus(200);
    return;
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      expoPushToken: token,
    },
  });
  res.sendStatus(200);
});
export default saveToken;
