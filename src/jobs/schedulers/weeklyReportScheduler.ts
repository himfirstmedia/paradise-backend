import { notificationQueue } from "../queues/notificationQueue";

export async function scheduleWeeklyReport() {
  await notificationQueue.add(
    "weeklyReport",
    {},
    {
      repeat: {
        pattern: "0 8 * * 1",
        immediately: false,   // optional, whether to run immediately on add
      },
    }
  );
}
