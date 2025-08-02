import axios, { AxiosError } from 'axios';
import prisma from 'config/prisma';

interface NotificationPayload {
  to: string | string[]; // Support single token or array for batch
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string; // Optional sound field
}

interface ExpoResponse {
  data: Array<{ status: string; details?: { error?: string } }>;
  errors?: any[];
}

async function sendExpoNotification(payload: NotificationPayload, retries = 3, retryDelay = 1000): Promise<ExpoResponse | null> {
  // Normalize payload to always be an array for batch support
  const messages = Array.isArray(payload.to)
    ? payload.to.map(to => ({
        to,
        sound: payload.sound || 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      }))
    : [{
        to: payload.to,
        sound: payload.sound || 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      }];

  let attempt = 0;
  while (attempt < retries) {
    try {
      console.log(`Sending push notification (attempt ${attempt + 1}/${retries}):`, JSON.stringify(messages, null, 2));
      
      const response = await axios.post<ExpoResponse>(
        'https://exp.host/--/api/v2/push/send',
        messages, // Send array for batch support
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          timeout: 10000, // Set timeout to avoid hanging
        }
      );

      console.log('Expo push response:', JSON.stringify(response.data, null, 2));

      // Handle errors in response
      if (response.data.errors) {
        console.error('Expo push errors:', JSON.stringify(response.data.errors, null, 2));
      }

      // Handle individual notification errors (e.g., DeviceNotRegistered)
      if (response.data.data) {
        const invalidTokens: string[] = [];
        response.data.data.forEach((result, index) => {
          if (result.status === 'error' && result.details?.error === 'DeviceNotRegistered') {
            const token = Array.isArray(payload.to) ? payload.to[index] : payload.to;
            if (typeof token === 'string') {
              invalidTokens.push(token);
            }
          }
        });

        // Clear invalid tokens from database
        if (invalidTokens.length > 0) {
          console.log('Removing invalid push tokens:', invalidTokens);
          await prisma.user.updateMany({
            where: { expoPushToken: { in: invalidTokens } },
            data: { expoPushToken: null },
          });
        }
      }

      return response.data;
    } catch (err) {
      const error = err as AxiosError;
      attempt++;
      console.error(`Push notification failed (attempt ${attempt}/${retries}):`, error.response?.data || error.message);

      if (attempt < retries) {
        console.log(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      console.error('Max retries reached. Notification failed.');
      return null;
    }
  }

  return null; // Fallback return for TypeScript
}

export default sendExpoNotification;