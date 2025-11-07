import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { SocketProvider } from "./context/SocketContext.jsx";
import { AudioProvider } from "./context/AudioContext.jsx";

const initialiseTheme = () => {
  try {
    const storedTheme = localStorage.getItem("app-theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const theme = storedTheme || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (error) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
};

initialiseTheme();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SocketProvider>
      <AudioProvider>
        <App />
      </AudioProvider>
    </SocketProvider>
  </StrictMode>
);
