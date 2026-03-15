import { createSlice } from "@reduxjs/toolkit";

interface UiState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: "light" | "dark" | "system";
}

const initialState: UiState = {
  sidebarOpen: false,
  sidebarCollapsed: false,
  theme: "light",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action) {
      state.sidebarOpen = action.payload;
    },
    toggleSidebarCollapsed(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setTheme(state, action) {
      state.theme = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebarOpen, toggleSidebarCollapsed, setTheme } =
  uiSlice.actions;
export default uiSlice.reducer;
