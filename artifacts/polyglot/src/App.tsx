import { Switch, Route, Router as WouterRouter } from "wouter";
import { setBaseUrl } from "@workspace/api-client-react";

// Configure the API client to use a remote backend in production
const remoteApiUrl = import.meta.env.VITE_API_URL;
if (remoteApiUrl) {
  setBaseUrl(remoteApiUrl);
}
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Layout } from "./components/layout";
import Home from "./pages/home";
import History from "./pages/history";
import Toolchains from "./pages/toolchains";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/history" component={History} />
        <Route path="/toolchains" component={Toolchains} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
