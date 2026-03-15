import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import apiClient from "@/lib/api-client";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  tenantId?: string;
  branchId?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Synchronously hydrate auth state from localStorage on store creation
// This ensures the AuthGuard sees the correct state on the very first render frame
function getInitialState(): AuthState {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      // No token = definitely not authenticated, no need to load
      return { user: null, isAuthenticated: false, isLoading: false, error: null };
    }
    const cached = localStorage.getItem("user");
    if (cached) {
      try {
        // Token + cached user → authenticated immediately
        return { user: JSON.parse(cached), isAuthenticated: true, isLoading: false, error: null };
      } catch { /* bad cache, fall through */ }
    }
    // Token exists but no cache → need to fetchMe (show loading)
    return { user: null, isAuthenticated: false, isLoading: true, error: null };
  }
  // SSR fallback
  return { user: null, isAuthenticated: false, isLoading: true, error: null };
}

const initialState: AuthState = getInitialState();

export const login = createAsyncThunk(
  "auth/login",
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post("/auth/login", credentials);
      localStorage.setItem("accessToken", data.data.accessToken);
      localStorage.setItem("refreshToken", data.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.data.user));
      return data.data.user as User;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      return rejectWithValue(error.response?.data?.error?.message || "Login failed");
    }
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async (
    payload: { firstName: string; lastName: string; email: string; password: string; phone: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await apiClient.post("/auth/register", payload);
      localStorage.setItem("accessToken", data.data.accessToken);
      localStorage.setItem("refreshToken", data.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.data.user));
      return data.data.user as User;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      return rejectWithValue(error.response?.data?.error?.message || "Registration failed");
    }
  }
);

export interface RegisterHotelPayload {
  owner: { firstName: string; lastName: string; email: string; password: string; phone?: string };
  hotel: {
    name: string;
    description?: string;
    contactEmail: string;
    contactPhone?: string;
    currency?: string;
    timezone?: string;
    starRating?: number;
  };
  branch: {
    name: string;
    city?: string;
    region?: string;
    country?: string;
    address?: { street?: string; city?: string; region?: string; country?: string };
    location?: { lat: number; lng: number };
    googlePlaceId?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
}

export const registerHotel = createAsyncThunk(
  "auth/registerHotel",
  async (payload: RegisterHotelPayload, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post("/auth/register-hotel", payload);
      localStorage.setItem("accessToken", data.data.accessToken);
      localStorage.setItem("refreshToken", data.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.data.user));
      return data.data.user as User;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      return rejectWithValue(error.response?.data?.error?.message || "Registration failed");
    }
  }
);

export const fetchMe = createAsyncThunk("auth/fetchMe", async (_, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get("/auth/me");
    return data.data as User;
  } catch {
    return rejectWithValue("Session expired");
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthInitialized(state) {
      state.isLoading = false;
    },
    hydrateUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(registerHotel.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerHotel.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(registerHotel.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchMe.pending, (state) => {
        // Only show loading if user isn't already hydrated from cache
        if (!state.isAuthenticated) {
          state.isLoading = true;
        }
      })
      .addCase(fetchMe.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        // Keep cache in sync
        try { localStorage.setItem("user", JSON.stringify(action.payload)); } catch { }
      })
      .addCase(fetchMe.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        // Clear stale cache
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      });
  },
});

export const { setAuthInitialized, hydrateUser, logout, clearError } = authSlice.actions;
export type { RegisterHotelPayload as RegisterHotelInput };
export default authSlice.reducer;
