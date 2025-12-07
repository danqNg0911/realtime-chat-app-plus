import { useRef, useEffect, useState } from "react";
import "./AuthPage.css";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store";
import { toast } from "react-toastify";
import { apiClient } from "../../lib/api-client";
import { LOGIN_ROUTE, SIGNUP_ROUTE } from "../../utils/constants";
import { FaGoogle, FaGithub } from "react-icons/fa";
import { saveAuthToken } from "../../lib/auth-token";

const AuthPage = () => {
  const navigate = useNavigate();
  const { setUserInfo, setActiveIcon } = useAppStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // For displaying errors on UI  
  const [oauthProviders, setOauthProviders] = useState({
    google: false,
    github: false,
  });

  // **TRẠNG THÁI RESEND TỪ SIGNUP**
  const [showResendForm, setShowResendForm] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0); 
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  //

  const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

  // Auto-close error after 4 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Fetch available OAuth providers on mount
  useEffect(() => {
    const fetchOAuthProviders = async () => {
      try {
        const response = await apiClient.get("/api/auth/oauth-providers");
        if (response.data) {
          setOauthProviders(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch OAuth providers:", error);
      }
    };
    fetchOAuthProviders();

    // Check for OAuth error in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    if (error) {
      // Decode the error message
      const decodedError = decodeURIComponent(error);

      // Set error message to display on UI (single source of truth)
      setErrorMessage(decodedError);

      // Clean up URL without reloading the page
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const validateLogin = () => {
    if (!email.length) {
      toast.warn("Email is required");
      return false;
    }
    if (!password.length) {
      toast.warn("Password is required");
      return false;
    }
    return true;
  };

  const validateSignup = () => {
    if (!email.length) {
      toast.warn("Email is required");
      return false;
    }
    if (!password.length) {
      toast.warn("Password is required");
      return false;
    }
    if (password !== confirmPassword) {
      toast.warn("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMessage(""); // Clear previous errors
    if (validateLogin()) {
      try {
        const response = await apiClient.post(
          LOGIN_ROUTE,
          {
            email,
            password,
          },
          { withCredentials: true }
        );
        if (response.data.user.id) {
          if (response.data.token) {
            saveAuthToken(response.data.token);
          }
          setUserInfo(response.data.user);
          if (response.data.user.profileSetup) {
            navigate("/chat");
          } else {
            navigate("/profile");
          }
          setActiveIcon("chat");
          toast.success("Login successful");
        }
      } catch (error) {
        console.error("Login error:", error);
        const errMsg = error.response?.data?.error || "Login failed";

        // Set error message to display on UI (replaces any previous error)
        setErrorMessage(errMsg);
      }
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setErrorMessage(""); // Clear previous errors
    if (validateSignup()) {
      try {
        console.log("validation successful");
        const response = await apiClient.post(
          SIGNUP_ROUTE,
          {
            email,
            password,
          },
          { withCredentials: true }
        );

         // If server created a pending user and sent verification email
        if (response.data?.isPending) {
          toast.info("Hãy truy cập vào email của bạn để xác thực");
          // Show resend UI and switch to sign-in panel
          setPendingUserId(response.data.pendingUserId || null);
          setShowResendForm(true);
          // remove right-panel-active so sign-in panel is visible
          if (containerRef?.current) {
            containerRef.current.classList.remove("right-panel-active");
          }
          // optional: clear password fields
          setPassword("");
          setConfirmPassword("");
          return;
        }
        //

        if (response.status === 201) {
          if (response.data.token) {
            saveAuthToken(response.data.token);
          }
          setUserInfo(response.data.user);
          navigate("/profile");
          toast.success("Signup successful");
        }
      } catch (error) {
        console.error("Signup error:", error);
        const errMsg = error.response?.data?.error || "Signup failed";

        // Set error message to display on UI (replaces any previous error)
        setErrorMessage(errMsg);
      }
    }
  };

  //handle resend verification email
  const handleResend = async () => {
    if (!email) {
      toast.warn("Please enter the email used to sign up in the form above");
      return;
    }
    setResendLoading(true);
    try {
      const res = await apiClient.post("/api/auth/resend-verification", { email });
      toast.success(res.data?.message || "Verification email resent");
      if (res.data?.attemptsRemaining !== undefined) {
        setAttemptsRemaining(res.data.attemptsRemaining);
      }
      const retryMs = res.data?.retryAfterMs || 60000;
      setResendCountdown(Math.ceil(retryMs / 1000));
    } catch (err) {
      const retry = err.response?.data?.retryAfterMs;
      if (retry) {
        setResendCountdown(Math.ceil(retry / 1000));
      }
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to resend");
    } finally {
      setResendLoading(false);
    }
  };
  //

  const handleOAuthLogin = (provider) => {
    // Prevent form submission
    window.location.href = `${API_URL}/api/auth/${provider}`;
  };

  const containerRef = useRef(null);
  const signUpButtonRef = useRef(null);
  const signInButtonRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const signUpButton = signUpButtonRef.current;
    const signInButton = signInButtonRef.current;

    const handleSignUpClick = () => {
      container.classList.add("right-panel-active");
    };

    const handleSignInClick = () => {
      container.classList.remove("right-panel-active");
    };

    signUpButton.addEventListener("click", handleSignUpClick);
    signInButton.addEventListener("click", handleSignInClick);

    // Cleanup event listeners when the component unmounts
    return () => {
      signUpButton.removeEventListener("click", handleSignUpClick);
      signInButton.removeEventListener("click", handleSignInClick);
    };
  }, []);

  return (
    <div className="auth-page">
      <div className="container" ref={containerRef} id="container">
        {/* Error Alert Box - Displayed prominently at the top */}
        {errorMessage && (
          <div className="auth-error-alert">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{errorMessage}</span>
            <button
              className="error-close"
              onClick={() => setErrorMessage("")}
              aria-label="Close error message"
            >
              ✕
            </button>
          </div>
        )}

        <div className="form-container sign-up-container">
          <form onSubmit={handleSignup}>
            <h1 className="sign-up-heading">Create Account</h1>
            {(oauthProviders.google || oauthProviders.github) && (
              <div className="social-container">
                {oauthProviders.google && (
                  <button
                    type="button"
                    className="social google"
                    onClick={(e) => {
                      e.preventDefault();
                      handleOAuthLogin("google");
                    }}
                    title="Sign up with Google"
                  >
                    <FaGoogle className="oauth-icon" />
                    <span>Continue with Google</span>
                  </button>
                )}
                {oauthProviders.github && (
                  <button
                    type="button"
                    className="social github"
                    onClick={(e) => {
                      e.preventDefault();
                      handleOAuthLogin("github");
                    }}
                    title="Sign up with GitHub"
                  >
                    <FaGithub className="oauth-icon" />
                    <span>Continue with GitHub</span>
                  </button>
                )}
              </div>
            )}
            {(oauthProviders.google || oauthProviders.github) && (
              <span className="or-divider">or use your email</span>
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="submit"
              className={
                email.length && password.length && confirmPassword.length
                  ? ""
                  : "disabled-auth-button"
              }
            >
              Sign Up
            </button>
          </form>
        </div>
        <div className="form-container sign-in-container">
          <form onSubmit={handleLogin}>
            <h1 className="sign-in-heading">Sign in</h1>
            {(oauthProviders.google || oauthProviders.github) && (
              <div className="social-container">
                {oauthProviders.google && (
                  <button
                    type="button"
                    className="social google"
                    onClick={(e) => {
                      e.preventDefault();
                      handleOAuthLogin("google");
                    }}
                    title="Sign in with Google"
                  >
                    <FaGoogle className="oauth-icon" />
                    <span>Continue with Google</span>
                  </button>
                )}
                {oauthProviders.github && (
                  <button
                    type="button"
                    className="social github"
                    onClick={(e) => {
                      e.preventDefault();
                      handleOAuthLogin("github");
                    }}
                    title="Sign in with GitHub"
                  >
                    <FaGithub className="oauth-icon" />
                    <span>Continue with GitHub</span>
                  </button>
                )}
              </div>
            )}
            {(oauthProviders.google || oauthProviders.github) && (
              <span className="or-divider">or use your account</span>
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <a href="#" className="forgot-password-link">
              Forgot your password?
            </a>
            <button
              type="submit"
              className={
                email.length && password.length ? "" : "disabled-auth-button"
              }
            >
              Sign In
            </button>
          </form>
        </div>
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1>Welcome Back!</h1>
              <p>
                Already have an account? Please login with your personal info.
              </p>
              <button className="ghost" ref={signInButtonRef}>
                Sign In
              </button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1>Hello!</h1>
              <p>{"Don't"} have an account? Create one!</p>
              <button className="ghost" ref={signUpButtonRef}>
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
