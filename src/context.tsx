import { SiteContext } from "./site-context";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { SiteData } from "./types";
import { readSite, writeSite, supabase, demoMode } from "./lib/repository";
export function SiteProvider({ children }: { children: ReactNode }) {
  const currentUser = useRef<string | null>(null);
  const readRequest = useRef(0);
  const [data, setData] = useState<SiteData | null>(null),
    [version, setVersion] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [session, setSession] = useState<Session | null>(null),
    [admin, setAdmin] = useState(false),
    [authReady, setAuthReady] = useState(!supabase);
  async function reload() {
    const request = ++readRequest.current;
    setLoading(true);
    setError("");
    try {
      const result = await readSite();
      if (request !== readRequest.current) return false;
      setData(result.data);
      setVersion(result.version);
      return true;
    } catch (e) {
      if (request === readRequest.current) setError((e as Error).message);
      return false;
    } finally {
      if (request === readRequest.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (!supabase) {
      void reload();
      return;
    }
    let active = true;
    let authVersion = 0;
    async function update(next: Session | null) {
      if (!active) return;
      const request = ++authVersion;
      const current = () => active && request === authVersion;
      currentUser.current = next?.user.id ?? null;
      setSession(next);
      setAdmin(false);
      setAuthReady(false);
      try {
        let permitted = false;
        if (next) {
          const { data: allowed, error } = await supabase!.rpc("is_admin");
          if (error) throw error;
          permitted = Boolean(allowed);
        }
        if (current()) {
          const loaded = await reload();
          if (current() && loaded) setAdmin(permitted);
        }
      } catch (e) {
        if (current()) {
          setError((e as Error).message);
          setLoading(false);
        }
      } finally {
        if (current()) setAuthReady(true);
      }
    }
    void supabase.auth
      .getSession()
      .then(({ data }) => update(data.session))
      .catch((e) => {
        if (active) {
          setError((e as Error).message);
          setLoading(false);
          setAuthReady(true);
        }
      });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, next) => {
        if (
          event === "INITIAL_SESSION" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        )
          return;
        if (event === "SIGNED_IN" && next?.user.id === currentUser.current) {
          setSession(next);
          return;
        }
        setTimeout(() => void update(next), 0);
      },
    );
    return () => {
      active = false;
      readRequest.current++;
      listener.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (data) {
      document.documentElement.style.setProperty(
        "--primary",
        data.settings.primary,
      );
      document.documentElement.style.setProperty(
        "--accent",
        data.settings.accent,
      );
    }
  }, [data]);
  async function save(next: SiteData) {
    const newVersion = await writeSite(next, version);
    setData(structuredClone(next));
    setVersion(newVersion);
  }
  return (
    <SiteContext.Provider
      value={{
        data,
        loading,
        error,
        session,
        admin,
        authReady,
        demo: demoMode,
        reload,
        save,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}
