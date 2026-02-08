import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, persistSessionIfNeeded, restoreRememberedSessionIfPossible } from "./supabase";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getSupabase();

    (async () => {
      await restoreRememberedSessionIfPossible();
      const { data } = await sb.auth.getSession();
      setSession(data.session ?? null);
      setLoading(false);
    })();

    const { data: authListener } = sb.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      persistSessionIfNeeded(sess);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}