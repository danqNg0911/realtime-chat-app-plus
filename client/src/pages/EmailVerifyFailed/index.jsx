import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { toast } from "react-toastify";
import "./VerifyFailed.css";

export default function VerifyFailed() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.warn("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/api/auth/resend-verification", {
        email,
      });
      toast.success(res.data?.message || "Verification email sent");
      setEmail("");
      setTimeout(() => navigate("/auth"), 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to resend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-failed-container">
      <div className="failed-card">
        <div className="failed-icon">⏱️</div>
        <h1>Verification Link Expired</h1>
        <p>Your verification link has expired. Please request a new one.</p>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="email-input"
        />
        <button
          className="resend-button"
          onClick={handleResend}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Verification Link Again"}
        </button>
        <button
          className="back-button"
          onClick={() => navigate("/auth")}
        >
          Back to Sign In
        </button>
      </div>
    </div>
  );
}
