import { create } from "zustand";
import { createAuthSlice } from "./slices/auth-slice";
import { createChatSlice } from "./slices/chat-slice";
import { createActiveIconSlice } from "./slices/active-icon-slice";
import { createThemeSlice } from "./slices/theme-slice";

export const useAppStore = create()((...a) => ({
  ...createAuthSlice(...a),
  ...createChatSlice(...a),
  ...createActiveIconSlice(...a),
  ...createThemeSlice(...a),
}));
