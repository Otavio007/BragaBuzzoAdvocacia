import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useSite } from "./site-context";
import { Entrance, Law, Estate, PropertyDetail } from "./pages";
import { FloatingWhatsApp, NotFound } from "./components";
const Admin = lazy(() =>
  import("./admin").then((module) => ({ default: module.Admin })),
);
function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="loading-screen" role="status">
          Abrindo painel…
        </div>
      }
    >
      <Admin />
    </Suspense>
  );
}
function Scroll() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() =>
        document.getElementById(hash.slice(1))?.scrollIntoView(),
      );
    } else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
export default function App() {
  const { loading, error, data } = useSite();
  const location = useLocation();
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content =
      location.pathname === "/admin" || location.pathname.startsWith("/admin/")
        ? "noindex, nofollow"
        : "index, follow";
  }, [location.pathname]);
  if (loading && !data)
    return (
      <div className="loading-screen" role="status">
        <div className="loader" />
        <p>Preparando seu próximo passo…</p>
      </div>
    );
  if (error)
    return (
      <div className="empty-page" role="alert">
        <h1>Não foi possível carregar.</h1>
        <p>{error}</p>
        <button className="button" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
        {location.pathname === "/admin" && <AdminPage />}
      </div>
    );
  return (
    <>
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <Scroll />
      <div id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Entrance />} />
          <Route path="/advocacia" element={<Law />} />
          <Route path="/imobiliaria" element={<Estate />} />
          <Route
            path="/imobiliaria/imoveis/:slug"
            element={<PropertyDetail />}
          />
          <Route path="/admin/*" element={<AdminPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <FloatingWhatsApp />
    </>
  );
}
