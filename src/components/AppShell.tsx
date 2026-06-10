import { ReactNode, useEffect } from "react";
import { BottomNav } from "./BottomNav";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueueStore } from "@/store/useQueueStore";

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { loadMyEntries, subscribeMine } = useQueueStore();
  const hideNav = pathname.startsWith("/dashboard") || pathname === "/auth";

  useEffect(() => {
    loadMyEntries();
    const off = subscribeMine();
    return off;
  }, [loadMyEntries, subscribeMine]);

  // Handle in-app deep links from the service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.kind === "navigate" && typeof msg.url === "string") {
        navigate(msg.url);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-muted/40 sm:py-6">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-background sm:min-h-[860px] sm:rounded-[2.25rem] sm:phone-frame">
        <div className="relative flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}
