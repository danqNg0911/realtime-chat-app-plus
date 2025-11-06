# OAuth Testing Guide - Hướng dẫn Test OAuth

## ✅ Đã Hoàn Thành

1. **OAuth Infrastructure** - Cơ sở hạ tầng OAuth hoàn chỉnh:
   - ✅ Google OAuth strategy đã cấu hình
   - ✅ Facebook OAuth strategy đã cấu hình
   - ✅ GitHub OAuth strategy đã cấu hình
   - ✅ Environment variables đang load đúng
   - ✅ Server khởi động thành công trên port 3001
   - ✅ MongoDB kết nối thành công

2. **UI/UX Updates** - Cập nhật giao diện:
   - ✅ Toàn bộ trang login đã chuyển sang dark theme
   - ✅ Background gradient tối đẹp mắt với hiệu ứng hoạt hình
   - ✅ OAuth buttons đã giảm kích thước (max-width: 280px)
   - ✅ Input fields có dark theme với focus effects
   - ✅ Container glassmorphic với backdrop-filter
   - ✅ Purple gradient overlay (#667eea → #764ba2)

3. **Error Logging** - Logging lỗi chi tiết:
   - ✅ Console logs hiển thị OAuth provider availability
   - ✅ Callback errors được log ra console
   - ✅ Success messages cho Google và GitHub OAuth

## 🔧 Cần Làm Tiếp (Next Steps)

### Bước 1: Cấu hình Google Cloud Console

**Vấn đề**: OAuth callbacks có thể bị lỗi `redirect_uri_mismatch` nếu callback URL chưa được thêm vào Google Cloud Console.

**Giải pháp**:

1. Truy cập: https://console.cloud.google.com/
2. Chọn project của bạn
3. Vào **APIs & Services** → **Credentials**
4. Click vào OAuth 2.0 Client ID của bạn (Client ID: `402686198461-iajt4cap1eosqs6g7m63ceq6lvo8b4ni.apps.googleusercontent.com`)
5. Trong phần **Authorized redirect URIs**, thêm:
   ```
   http://localhost:3001/api/auth/google/callback
   ```
6. Click **SAVE** và đợi vài giây để changes được apply

### Bước 2: Cấu hình GitHub OAuth App

**Vấn đề**: Tương tự Google, GitHub cũng cần callback URL được cấu hình đúng.

**Giải pháp**:

1. Truy cập: https://github.com/settings/developers
2. Click vào **OAuth Apps**
3. Chọn app của bạn (Client ID: `Ov23liFD9p2JBMsLFINf`)
4. Trong **Authorization callback URL**, đảm bảo có:
   ```
   http://localhost:3001/api/auth/github/callback
   ```
5. Click **Update application**

### Bước 3: Cấu hình Facebook App (Optional - nếu muốn dùng)

Hiện tại Facebook credentials chưa được cấu hình đúng (vẫn là `your-facebook-app-id`).

**Để cấu hình Facebook**:

1. Truy cập: https://developers.facebook.com/
2. Tạo/chọn app của bạn
3. Vào **Settings** → **Basic**
4. Lấy **App ID** và **App Secret**
5. Update file `server/.env`:
   ```
   FACEBOOK_APP_ID="your-actual-app-id"
   FACEBOOK_APP_SECRET="your-actual-app-secret"
   ```
6. Trong **Facebook Login Settings**, thêm:
   ```
   Valid OAuth Redirect URIs: http://localhost:3001/api/auth/facebook/callback
   ```

### Bước 4: Test OAuth Flow

Sau khi cấu hình xong Google Cloud Console và GitHub:

1. **Start cả client và server**:
   ```cmd
   # Terminal 1 - Server
   cd server
   node index.js
   
   # Terminal 2 - Client  
   cd client
   npm run dev
   ```

2. **Mở browser** và truy cập: `http://localhost:3000/auth`

3. **Test Google OAuth**:
   - Click button "Continue with Google"
   - Nên redirect đến Google consent screen
   - Chọn account và cho phép permissions
   - Nên redirect về app với JWT cookie đã set
   - Check console logs:
     ```
     ✅ Google OAuth successful: user@example.com
     ```

4. **Test GitHub OAuth**:
   - Click button "Continue with GitHub"
   - Nên redirect đến GitHub authorization
   - Click "Authorize"
   - Nên redirect về app
   - Check console logs:
     ```
     ✅ GitHub OAuth successful: user@example.com
     ```

## 🐛 Troubleshooting - Xử lý lỗi

### Lỗi: `redirect_uri_mismatch`

**Nguyên nhân**: Callback URL trong code không khớp với Google Cloud Console.

**Giải pháp**: Làm theo **Bước 1** ở trên.

### Lỗi: `google_auth_failed` hoặc `github_auth_failed`

**Kiểm tra**:
1. Console logs có hiển thị lỗi gì không?
2. Callback URL có đúng không?
3. Client ID và Client Secret có đúng không?

**Debug**:
```cmd
# Check server logs trong terminal
# Nên thấy:
🔐 Passport Configuration:
- Google OAuth: true
- GitHub OAuth: true
- Server URL: http://localhost:3001
```

### Lỗi: Button OAuth không hiện

**Nguyên nhân**: Frontend không fetch được `/api/auth/oauth-providers`

**Kiểm tra**:
1. Server có đang chạy trên port 3001 không?
2. CORS có được cấu hình đúng không?
3. Client có đang gọi đúng `VITE_SERVER_URL` không?

**Debug**:
```javascript
// Trong browser console
fetch('http://localhost:3001/api/auth/oauth-providers')
  .then(r => r.json())
  .then(console.log)
// Nên return: { google: true, facebook: true, github: true }
```

### Lỗi: "This email is already registered with..."

**Nguyên nhân**: Email đã được dùng với provider khác.

**Giải pháp**: Đây là tính năng bảo mật - mỗi email chỉ có thể dùng 1 authentication method.

**Ví dụ**:
- Nếu đã signup với Google (`user@gmail.com`)
- Thì không thể login thủ công với cùng email đó
- Phải dùng Google để login

## 📊 Expected Behavior - Hành vi mong đợi

### Khi login với OAuth thành công:

1. **Backend**:
   - User được tạo/cập nhật trong MongoDB
   - JWT token được generate
   - Cookie được set với token
   - Redirect đến `/chat` (nếu profile đã setup) hoặc `/profile` (nếu chưa)

2. **Frontend**:
   - User được redirect về app
   - Token được lưu trong cookie
   - Redux store được update với user info
   - UI hiển thị trang chat hoặc profile

3. **Console Logs**:
   ```
   ✅ Google OAuth successful: user@example.com
   // hoặc
   ✅ GitHub OAuth successful: user@example.com
   ```

### Khi có lỗi:

1. **Backend Logs**:
   ```
   ❌ Google OAuth: No user found after authentication
   // hoặc
   ❌ Google OAuth callback error: [error details]
   ```

2. **Frontend**:
   - Redirect về `/auth?error=google_auth_failed`
   - Có thể hiển thị error message

## 🎯 Current Status - Trạng thái hiện tại

✅ **Server**: Đang chạy thành công, OAuth providers đã load
✅ **Environment Variables**: Đã load đúng với path-based config
✅ **Google Credentials**: Có trong `.env`
✅ **GitHub Credentials**: Có trong `.env`
⏳ **Google Console**: Cần thêm callback URL
⏳ **GitHub App**: Cần verify callback URL
⚠️ **Facebook**: Credentials chưa cấu hình (optional)

## 🚀 Next Actions - Hành động tiếp theo

1. **Ngay bây giờ**: Thêm callback URL vào Google Cloud Console (Bước 1)
2. **Sau đó**: Verify GitHub callback URL (Bước 2)
3. **Cuối cùng**: Test OAuth flow với cả Google và GitHub (Bước 4)
4. **(Optional)**: Cấu hình Facebook nếu muốn (Bước 3)

---

**Lưu ý quan trọng**:
- Development (localhost): Dùng `http://` là OK
- Production: BẮT BUỘC dùng `https://`
- Callback URLs phải chính xác 100% (không có `/` thừa ở cuối)
- Đợi vài giây sau khi save changes trong OAuth consoles
