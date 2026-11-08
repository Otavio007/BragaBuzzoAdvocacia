import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";
import type { SiteData } from "./types";
interface Value {
  data: SiteData | null;
  loading: boolean;
  error: string;
  session: Session | null;
  admin: boolean;
  authReady: boolean;
  demo: boolean;
  reload: () => Promise<boolean>;
  save: (data: SiteData) => Promise<void>;
}
export const SiteContext = createContext<Value>(null!);
export const useSite = () => useContext(SiteContext);
