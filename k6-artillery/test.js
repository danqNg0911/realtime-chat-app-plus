import ws from 'k6/ws';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  // Thay ID user giả của bạn vào đây
  const userId = "692a60f92b5e1a0a597e6d49"; 
  const recipientId = "692a60082b5e1a0a597e6879";

  // --- THỬ SỬA LOCALHOST THÀNH 127.0.0.1 ---
  const url = `ws://127.0.0.1:4002/socket.io/?EIO=4&transport=websocket&userId=${userId}`;

  console.log(`📡 Đang thử kết nối tới: ${url}`);

  const params = {
    // Giả lập header giống trình duyệt để tránh bị chặn
    headers: {
        'User-Agent': 'k6-load-test',
        'Origin': 'http://localhost:3000' 
    },
    tags: { my_tag: 'debug' } 
  };

  const res = ws.connect(url, params, function (socket) {
    socket.on('open', () => console.log('✅ KẾT NỐI THÀNH CÔNG (Socket Open)'));
    
    socket.on('message', (msg) => {
        console.log(`📩 Nhận tin nhắn: ${msg}`);
        if (msg === '2') socket.send('3'); // Ping-pong
        if (msg.startsWith('0')) socket.send('40'); // Handshake
    });

    socket.on('close', () => console.log('❌ Socket đã đóng'));
    socket.on('error', (e) => console.log('⚠️ Lỗi Socket:', e.error()));
  });

  // --- LOG CHI TIẾT LỖI HTTP ---
  // Nếu kết nối thất bại ngay từ vòng gửi request HTTP (chưa kịp upgrade lên WS)
  if (res.status !== 101) {
      console.log(`🔴 LỖI NGHIÊM TRỌNG: Server trả về HTTP Status ${res.status}`);
      console.log(`🔴 Nội dung lỗi: ${res.body}`);
      console.log(`🔴 Gợi ý: Kiểm tra lại Port 4002 hoặc xem server có đang chạy không.`);
  }

  check(res, { 'Status là 101 (Connected)': (r) => r && r.status === 101 });
}