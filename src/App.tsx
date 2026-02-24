import "./App.css";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppRoute from "./routes/AppRoutes";
import { VideoProvider } from "./context/VideoContext";
import { AuthProvider } from "./context/AuthContext";

const queryClient = new QueryClient();

declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: import("@tanstack/query-core").QueryClient;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <VideoProvider>
          <Toaster position="top-right" />
          <AppRoute />
        </VideoProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;