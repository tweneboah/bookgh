"use client";

import { Provider as ReduxProvider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useEffect, useRef } from "react";
import { makeStore, type AppStore } from "@/store";
import { fetchMe } from "@/store/auth-slice";
import { useAppDispatch } from "@/store/hooks";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    // Store already hydrated synchronously from localStorage via getInitialState().
    // Just validate the session in the background.
    const token = localStorage.getItem("accessToken");
    if (token) {
      dispatch(fetchMe());
    }
  }, [dispatch]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore>(null);
  if (!storeRef.current) {
    // Created on the client where localStorage is available
    storeRef.current = makeStore();
  }

  return (
    <ReduxProvider store={storeRef.current}>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer>{children}</AuthInitializer>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: "#1f2937", color: "#f9fafb", fontSize: "14px" },
          }}
        />
      </QueryClientProvider>
    </ReduxProvider>
  );
}
