import "./App.css";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppRoute from "./routes/AppRoutes";

const queryClient = new QueryClient();

declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: import("@tanstack/query-core").QueryClient;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right"/>
      <AppRoute />
    </QueryClientProvider>
  );
}

export default App;