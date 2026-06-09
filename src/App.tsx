import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import Home from "./pages/Home";
import ShopDetail from "./pages/ShopDetail";
import Booking from "./pages/Booking";
import Bookings from "./pages/Bookings";
import MapPage from "./pages/MapPage";
import Saved from "./pages/Saved";
import Profile from "./pages/Profile";
import Queue from "./pages/Queue";
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerQueue from "./pages/OwnerQueue";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop/:id" element={<ShopDetail />} />
            <Route path="/shop/:id/book" element={<Booking />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
