// services/chat-service/workers/ChatWorker.js
import Message from "./models/MessageModel.js";

const BATCH_SIZE = 100; // Mỗi lần gom 100 tin nhắn để lưu
const INTERVAL = 5000;  // 5 giây chạy 1 lần

export const startChatWorker = (redisClient) => {
  console.log("Chat Worker started...");

  setInterval(async () => {
    try {
      // 1. Lấy dữ liệu từ Redis (Lấy từ phần tử 0 đến 99)
      const rawMessages = await redisClient.lRange("chat_queue", 0, BATCH_SIZE - 1);

      if (rawMessages.length > 0) {
        // 2. Parse từ JSON string sang Object
        const messagesToSave = rawMessages.map((msg) => JSON.parse(msg));

        // 3. Lưu hàng loạt vào MongoDB (Bulk Insert - Siêu nhanh)
        if (messagesToSave.length > 0) {
            await Message.insertMany(messagesToSave);
            console.log(`Worker: Saved ${messagesToSave.length} messages to DB.`);
        }

        // 4. Xóa những tin nhắn đã lưu khỏi Redis
        // lTrim giữ lại từ phần tử BATCH_SIZE đến cuối cùng (xóa phần đầu đã lấy)
        await redisClient.lTrim("chat_queue", BATCH_SIZE, -1);
      }
    } catch (error) {
      console.error("Chat Worker Error:", error);
      // Lưu ý: Nếu lỗi DB, dữ liệu vẫn còn trong Redis, lần sau sẽ thử lại.
    }
  }, INTERVAL);
};