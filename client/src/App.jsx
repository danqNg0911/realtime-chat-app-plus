import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import ProfileLandingPage from "./pages/ProfileLandingPage";
import Notification from "./components/Notification";
import CallOverlay from "./components/Call/CallOverlay";
import GroupCallOverlay from "./components/Call/GroupCallOverlay";
import "./App.css";
import { useAppStore } from "./store";
import { useEffect, useState } from "react";
import { apiClient } from "./lib/api-client";
import { GET_USER_INFO_ROUTE } from "./utils/constants";
import { toast } from "react-toastify";
import { clearAuthToken } from "./lib/auth-token";

const AuthRoute = ({ children }) => {
  const { userInfo } = useAppStore();
  const isAuthenticated = !!userInfo;

  return isAuthenticated ? (
    userInfo.profileSetup ? (
      <Navigate to="/chat" />
    ) : (
      <Navigate to="/profile" />
    )
  ) : (
    children
  );
};

const ChatRoute = ({ children }) => {
  const { userInfo } = useAppStore();
  const isAuthenticated = !!userInfo;

  return isAuthenticated ? (
    userInfo.profileSetup ? (
      children
    ) : (
      <Navigate to="/profile" />
    )
  ) : (
    <Navigate to="/auth" />
  );
};

const ProfileLandingRoute = ({ children }) => {
  const { userInfo } = useAppStore();
  const isAuthenticated = !!userInfo;

  return isAuthenticated ? (
    userInfo.profileSetup ? (
      <Navigate to="/chat" />
    ) : (
      children
    )
  ) : (
    <Navigate to="/auth" />
  );
};

function App() {
  const { userInfo, setUserInfo } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const response = await apiClient.get(GET_USER_INFO_ROUTE, {
          withCredentials: true,
        });
        if (response.status === 200 && response.data.id) {
          setUserInfo(response.data);
        } else {
          setUserInfo(undefined);
        }
      } catch (error) {
        const status = error.response?.status;
        // Treat auth-related errors as unauthenticated without noisy toast
        if (status === 401 || status === 403 || status === 404) {
          setUserInfo(undefined);
          clearAuthToken();
        } else {
          console.error(error);
          toast.error(error.message);
        }
      } finally {
        setLoading(false);
      }
    };
    if (!userInfo) {
      getUserData();
    } else {
      setLoading(false);
    }
  }, [userInfo, setUserInfo]);

  if (loading) {
    return <div className="app-loading-indicator">Loading...</div>;
  }

  return (
    <div className="app">
      <BrowserRouter>
        <Routes>
          <Route
            path="/auth"
            element={
              <AuthRoute>
                <AuthPage />
              </AuthRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ChatRoute>
                <ChatPage />
              </ChatRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProfileLandingRoute>
                <ProfileLandingPage />
              </ProfileLandingRoute>
            }
          />
          <Route path="*" element={<Navigate to="/auth" />} />
        </Routes>
      </BrowserRouter>

      <Notification />
      <CallOverlay />
      <GroupCallOverlay />
    </div>
  );
}

export default App;
