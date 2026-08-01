import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/lib/auth";
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
import Auth from "./pages/Auth";
import BarberProfile from "./pages/BarberProfile";
import ShopBarbers from "./pages/ShopBarbers";
import BarberEdit from "./pages/BarberEdit";
import ReviewSubmit from "./pages/ReviewSubmit";
import Gallery from "./pages/Gallery";
import StyleDetail from "./pages/StyleDetail";
import GallerySearch from "./pages/GallerySearch";
import Wishlist from "./pages/Wishlist";
import GalleryUpload from "./pages/GalleryUpload";
import AdminOwners from "./pages/AdminOwners";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/shop/:id" element={<ShopDetail />} />
              <Route path="/shop/:id/book" element={<Booking />} />
              <Route path="/shop/:id/queue" element={<Queue />} />
              <Route path="/shop/:id/barbers" element={<ShopBarbers />} />
              <Route path="/barber/:id" element={<BarberProfile />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/bookings/:id/review" element={<ReviewSubmit />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={<OwnerDashboard />} />
              <Route path="/dashboard/queue" element={<OwnerQueue />} />
              <Route path="/dashboard/barber/profile" element={<BarberEdit />} />
              <Route path="/dashboard/gallery/upload" element={<GalleryUpload />} />
              <Route path="/dashboard/admin" element={<AdminOwners />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/gallery/search" element={<GallerySearch />} />
              <Route path="/gallery/style/:styleId" element={<StyleDetail />} />
              <Route path="/profile/wishlist" element={<Wishlist />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
