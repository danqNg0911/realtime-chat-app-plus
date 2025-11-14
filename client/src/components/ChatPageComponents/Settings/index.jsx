import "./Settings.css";
import { useAppStore } from "../../../store";
import { THEME_DARK, THEME_LIGHT, THEME_SYSTEM } from "../../../store/slices/settings-slice";

const Settings = () => {
  const { theme, setTheme } = useAppStore();

  const options = [
    { key: THEME_SYSTEM, label: "System" },
    { key: THEME_LIGHT, label: "Light" },
    { key: THEME_DARK, label: "Dark" },
  ];

  return (
    <div className="settings-panel">
      <div className="settings-section">
        <h3>Appearance</h3>
        <div className="theme-options">
          {options.map((opt) => (
            <button
              key={opt.key}
              className={`theme-option ${theme === opt.key ? "selected" : ""}`}
              onClick={() => setTheme(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;

