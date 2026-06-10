// One-time helper: generates a fresh VAPID keypair.
// You (the owner) call this, copy the output, then save them as project secrets:
//   VAPID_PUBLIC_KEY   = publicKey
//   VAPID_PRIVATE_KEY  = privateKey
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import webpush from "npm:web-push@3.6.7";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const keys = webpush.generateVAPIDKeys();
  return new Response(
    JSON.stringify({
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      note: "Save publicKey as VAPID_PUBLIC_KEY and privateKey as VAPID_PRIVATE_KEY in project secrets.",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
