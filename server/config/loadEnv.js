import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVICES_ENV_PATH = resolve(__dirname, "../../services/.env");

let loaded = false;

export const loadEnv = () => {
  if (loaded) {
    return SERVICES_ENV_PATH;
  }

  const result = dotenv.config({ path: SERVICES_ENV_PATH });

  if (result.error) {
    console.warn("Failed to load services/.env:", result.error.message);
  }

  loaded = true;
  return SERVICES_ENV_PATH;
};

loadEnv();

export default SERVICES_ENV_PATH;
