import { useNavigate } from "react-router-dom";
import "./VerifySuccess.css";

export default function VerifySuccess() {
  const navigate = useNavigate();

  return (
    <div className="verify-success-container">
      <div className="success-card">
        <div className="success-icon">✅</div>
        <h1>Email Verified!</h1>
        <p>Your email has been successfully verified.</p>
        <p>You can now sign in to your account.</p>
        <button className="success-button" onClick={() => navigate("/auth")}>
          Go to Sign In
        </button>
      </div>
    </div>
  );
}
