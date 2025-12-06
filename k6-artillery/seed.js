// seed.js
import mongoose from "mongoose";
import dotenv from "dotenv";

// Đảm bảo đường dẫn này trỏ đúng tới file Model User của bạn
// Nếu file model nằm ở src/models/UserModel.js thì sửa lại cho đúng
import User from "./models/UserModel.js"; 

dotenv.config();

// Lấy URL kết nối DB từ file .env hoặc điền trực tiếp vào đây
const DB_URI = process.env.DATABASE_URL || "mongodb://localhost:27017/vibechat_db"; // <-- KIỂM TRA LẠI TÊN DB

// Hàm tạo ID giả y hệt như trong script K6
const generateFakeId = (index) => {
  return `00000000000000000000${index.toString().padStart(4, "0")}`;
};

const seedUsers = async () => {
  try {
    await mongoose.connect(DB_URI);
    console.log("🔥 Đã kết nối MongoDB để tạo dữ liệu mẫu...");

    const users = [];
    // Tạo 100 User giả
    for (let i = 1; i <= 100; i++) {
      const _id = generateFakeId(i);
      users.push({
        _id: _id, 
        email: `loadtest_user_${i}@example.com`,
        password: "password_gia_123", 
        firstName: `LoadTest`,
        lastName: `User${i}`,
        image: "",
        color: i % 5,
        profileSetup: true,
      });
    }

    // Xóa user cũ trùng ID (để tránh lỗi trùng lặp nếu chạy lại)
    const ids = users.map(u => u._id);
    await User.deleteMany({ _id: { $in: ids } });

    // Thêm user mới vào DB
    await User.insertMany(users);
    
    console.log(`✅ THÀNH CÔNG: Đã tạo xong 100 users.`);
    console.log(`👉 User 1 ID: ${generateFakeId(1)}`);
    console.log(`👉 User 100 ID: ${generateFakeId(100)}`);
    
    process.exit();
  } catch (error) {
    console.error("❌ LỖI KHI TẠO USER:", error);
    process.exit(1);
  }
};

seedUsers();