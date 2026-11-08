import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, matchPath, useLocation } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Menu,
  X,
  MapPin,
  Phone,
  Clock,
  Instagram,
  MessageCircle,
  MoveUpRight,
} from "lucide-react";
import { useSite } from "./site-context";
import type { Area } from "./types";
import { whatsappUrl } from "./lib/domain";
export function PageMeta({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  useEffect(() => {
    document.title = title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", description);
  }, [title, description]);
  return null;
}
export function EmailText({ text }: { text: string }) {
  return (
    <>
      {text.split(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi).map((part, i) =>
        /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(part) ? (
          <a key={i} href={`mailto:${part}`}>
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}
export function Biography({ text }: { text: string }) {
  return (
    <div className="biography">
      {text.split(/\n\s*\n/).map((group, i) => {
        const lines = group.split("\n");
        const heading = lines[0].endsWith(":") ? lines.shift() : null;
        const bullets =
          lines.length > 0 && lines.every((line) => line.startsWith("• "));
        return (
          <div key={i}>
            {heading && <h4>{heading}</h4>}
            {bullets ? (
              <ul>
                {lines.map((line, j) => (
                  <li key={j}>
                    <EmailText text={line.slice(2)} />
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                <EmailText text={lines.join("\n")} />
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
export function Brand({ light = false }: { light?: boolean }) {
  const { data } = useSite();
  return (
    <Link
      className={`brand ${light ? "brand-light" : ""}`}
      to="/"
      aria-label={`${data?.settings.brand} — início`}
    >
      <img
        key={data?.settings.logo}
        src={data?.settings.logo}
        alt={data?.settings.brand}
        onLoad={(e) =>
          e.currentTarget.parentElement?.classList.remove("brand-fallback")
        }
        onError={(e) => {
          e.currentTarget.style.display = "none";
          e.currentTarget.parentElement?.classList.add("brand-fallback");
        }}
      />
      <span>{data?.settings.brand}</span>
    </Link>
  );
}
export function WhatsApp({
  area,
  service,
  title,
  link,
  children,
  className = "button",
  icon = true,
  label,
}: {
  area: Area;
  service?: string;
  title?: string;
  link?: string;
  children: ReactNode;
  className?: string;
  icon?: boolean;
  label?: string;
}) {
  const { data } = useSite();
  const [notice, setNotice] = useState(false);
  const trigger = useRef<HTMLAnchorElement>(null);
  const close = () => {
    setNotice(false);
    trigger.current?.focus();
  };
  const href = whatsappUrl(data!.settings, area, { service, title, link });
  return (
    <>
      <a
        ref={trigger}
        href={href ?? undefined}
        role={!href ? "button" : undefined}
        tabIndex={0}
        className={className}
        aria-label={label}
        title={label}
        target={href ? "_blank" : undefined}
        rel="noopener noreferrer"
        onClick={(e) => {
          if (!href) {
            e.preventDefault();
            setNotice(true);
          }
        }}
        onKeyDown={(e) => {
          if (!href && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setNotice(true);
          }
        }}
      >
        {icon && <MessageCircle size={17} />} {children}
      </a>
      {notice && (
        <div className="modal-backdrop" onClick={close}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Contato em configuração"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Vamos conversar em breve.</h2>
            <p>
              O WhatsApp ainda não foi informado. O contato será habilitado após
              a configuração.
            </p>
            <button
              className="button"
              autoFocus
              onClick={close}
              onKeyDown={(e) => {
                if (e.key === "Escape") close();
                if (e.key === "Tab") e.preventDefault();
              }}
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="29"
      height="29"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.52 3.48A11.87 11.87 0 0 0 12.05 0C5.47 0 .11 5.35.1 11.93c0 2.1.55 4.15 1.6 5.95L0 24l6.27-1.64a11.95 11.95 0 0 0 5.77 1.47h.01C18.63 23.83 24 18.48 24 11.9c0-3.19-1.24-6.18-3.48-8.42ZM12.05 21.8h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.73.98 1-3.64-.24-.37a9.87 9.87 0 0 1-1.52-5.25c0-5.47 4.45-9.92 9.92-9.92a9.86 9.86 0 0 1 7.01 2.9 9.85 9.85 0 0 1 2.9 7.01c0 5.47-4.45 9.92-9.92 9.92Zm5.44-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.9-.8-1.5-1.78-1.67-2.08-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.59-.49-.51-.67-.52h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.42.25-.69.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35Z" />
    </svg>
  );
}
export function FloatingWhatsApp() {
  const { data } = useSite();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    container.current
      ?.querySelector<HTMLElement>(".floating-contact-option")
      ?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  const area: Area | null = pathname.startsWith("/advocacia")
    ? "Advocacia"
    : pathname.startsWith("/imobiliaria")
      ? "Imobiliária"
      : null;
  const match = matchPath("/imobiliaria/imoveis/:slug", pathname);
  const property = data!.properties.find(
    (p) => p.slug === match?.params.slug && p.status === "publicado",
  );
  return (
    <div
      className="floating-whatsapp"
      ref={container}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          toggle.current?.focus();
        }
      }}
    >
      {area ? (
        <WhatsApp
          key={pathname}
          area={area}
          title={property?.title}
          link={
            property
              ? `${window.location.origin}/imobiliaria/imoveis/${property.slug}`
              : undefined
          }
          className="floating-whatsapp-button"
          icon={false}
          label={`Falar pelo WhatsApp — ${area}`}
        >
          <WhatsAppIcon />
        </WhatsApp>
      ) : (
        <>
          {open && (
            <div
              id="floating-contact-options"
              className="floating-contact-options"
              role="group"
              aria-label="Escolha a área para contato"
            >
              <strong>Como podemos ajudar?</strong>
              <span>Escolha a área para conversar.</span>
              <WhatsApp
                area="Advocacia"
                className="floating-contact-option"
                icon={false}
              >
                Advocacia <ArrowUpRight size={16} />
              </WhatsApp>
              <WhatsApp
                area="Imobiliária"
                className="floating-contact-option"
                icon={false}
              >
                Imobiliária <ArrowUpRight size={16} />
              </WhatsApp>
            </div>
          )}
          <button
            ref={toggle}
            type="button"
            className="floating-whatsapp-button"
            aria-label={
              open ? "Fechar opções de WhatsApp" : "Falar pelo WhatsApp"
            }
            title="Falar pelo WhatsApp"
            aria-expanded={open}
            aria-controls="floating-contact-options"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={27} /> : <WhatsAppIcon />}
          </button>
        </>
      )}
    </div>
  );
}
export function Header({ area }: { area: Area }) {
  const [open, setOpen] = useState(false);
  const { data } = useSite();
  const location = useLocation();
  useEffect(() => setOpen(false), [location]);
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <span className="header-area">{area}</span>
        <button
          className="menu-toggle"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          className={open ? "nav open" : "nav"}
          aria-label="Navegação principal"
        >
          {area === "Advocacia" ? (
            data!.content.sections
              .filter((s) => s.visible)
              .map((s) => (
                <a key={s.id} href={`#${s.id}`} onClick={() => setOpen(false)}>
                  {s.label}
                </a>
              ))
          ) : (
            <>
              <Link to="/imobiliaria">Imóveis para alugar</Link>
              <a href="#contato" onClick={() => setOpen(false)}>
                Contato
              </a>
            </>
          )}
          <Link
            className="switch-area"
            to={area === "Advocacia" ? "/imobiliaria" : "/advocacia"}
          >
            {area === "Advocacia" ? "Imobiliária" : "Advocacia"}{" "}
            <ArrowUpRight size={14} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
export function Footer({ area }: { area?: Area }) {
  const { data } = useSite();
  const s = data!.settings;
  return (
    <footer className="footer">
      <div className="container footer-top">
        <div>
          <Brand light />
          <p>{s.footerText}</p>
        </div>
        <div className="footer-links">
          <Link to="/advocacia">
            Advocacia <ArrowUpRight size={14} />
          </Link>
          <Link to="/imobiliaria">
            Imobiliária <ArrowUpRight size={14} />
          </Link>
          {s.instagram && (
            <a href={s.instagram} target="_blank" rel="noreferrer">
              <Instagram size={16} /> Instagram
            </a>
          )}
          {s.facebook && (
            <a href={s.facebook} target="_blank" rel="noreferrer">
              Facebook <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {s.brand}
          {area ? ` · ${area}` : ""}
        </span>
        <span>
          {s.showDemoNotice
            ? "Conteúdo demonstrativo · Imagens ilustrativas"
            : "Todos os direitos reservados."}
        </span>
      </div>
    </footer>
  );
}
export function Contact({ area }: { area: Area }) {
  const { data } = useSite();
  const s = data!.settings;
  return (
    <section id="contato" className="section contact">
      <div className="container contact-grid">
        <div>
          <span className="eyebrow">{data!.content.contactEyebrow}</span>
          <h2>{data!.content.contactTitle}</h2>
          <p className="muted">
            <EmailText text={data!.content.contactText} />
          </p>
          <WhatsApp area={area}>
            {data!.content.contactButton} <ArrowUpRight size={17} />
          </WhatsApp>
        </div>
        <div className="contact-details">
          <div>
            <MapPin />
            <span>
              <small>ONDE ESTAMOS</small>
              {s.address}
            </span>
          </div>
          <div>
            <Clock />
            <span>
              <small>ATENDIMENTO</small>
              {s.hours}
            </span>
          </div>
          <div>
            <Phone />
            <span>
              <small>TELEFONE</small>
              {s.phone ? (
                <a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`}>{s.phone}</a>
              ) : (
                "Telefone a informar"
              )}
            </span>
          </div>
          {s.mapQuery ? (
            <iframe
              title="Localização do escritório"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(s.mapQuery)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="map-placeholder">
              <MapPin size={22} />
              <span>A localização será informada em breve.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
export function TextLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}
export function NotFound() {
  return (
    <div className="empty-page">
      <PageMeta
        title="Página indisponível | Braga e Buzzo"
        description="A página solicitada não está disponível."
      />
      <MoveUpRight size={36} />
      <span className="eyebrow">ESTE CAMINHO NÃO ESTÁ DISPONÍVEL</span>
      <h1>Vamos encontrar outro caminho?</h1>
      <p>A página ou o imóvel pode ter sido removido ou não estar publicado.</p>
      <Link to="/" className="button">
        Voltar ao início <ArrowRight size={17} />
      </Link>
    </div>
  );
}
