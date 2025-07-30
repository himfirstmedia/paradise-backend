import axios from "axios";

export async function sendExpoNotification(token, title, body, data = {}) {
  try {
    const response = await axios.post(
      "https://exp.host/--/api/v2/push/send",
      {
        to: token, // Expo push token (ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx])
        sound: "default",
        title: title,
        body: body,
        data: data, // custom payload
      },
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Notification sent:", response.data);
  } catch (error) {
    console.error(
      "Error sending notification:",
      error.response?.data || error.message
    );
  }
}
