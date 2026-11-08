import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Building2,
  Check,
  ChevronRight,
  Eye,
  Home,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Plus,
  Save,
  Scale,
  Settings,
  Trash2,
  Users,
  X,
  LoaderCircle,
} from "lucide-react";
import { useSite } from "./site-context";
import { PageMeta } from "./components";
import { supabase, uploadImage } from "./lib/repository";
import { money, slugify } from "./lib/domain";
import type { Lawyer, Property, Service, SiteData } from "./types";
type FieldSpec = {
  key: string;
  label: string;
  type?: "textarea" | "image" | "color" | "url" | "tel";
  help?: string;
};
const generalFields: FieldSpec[] = [
  { key: "brand", label: "Nome da marca" },
  { key: "logo", label: "Logo", type: "image" },
  { key: "primary", label: "Cor principal", type: "color" },
  { key: "accent", label: "Cor de destaque", type: "color" },
  {
    key: "whatsapp",
    label: "WhatsApp",
    type: "tel",
    help: "Inclua país e DDD, por exemplo: 5511999999999. Deixe vazio para desabilitar o contato.",
  },
  { key: "phone", label: "Telefone", type: "tel" },
  { key: "address", label: "Endereço completo" },
  { key: "hours", label: "Horário de atendimento" },
  { key: "instagram", label: "Instagram", type: "url" },
  { key: "facebook", label: "Facebook", type: "url" },
  {
    key: "mapQuery",
    label: "Localização para o mapa",
    help: "Endereço que o Google Maps deve localizar. Deixe vazio para não exibir o mapa.",
  },
  { key: "footerText", label: "Texto do rodapé" },
  {
    key: "whatsappGeneral",
    label: "Mensagem geral do WhatsApp",
    type: "textarea",
    help: "Disponível: {area}. A área sempre será identificada automaticamente.",
  },
  {
    key: "whatsappService",
    label: "Mensagem para serviços",
    type: "textarea",
    help: "Disponíveis: {area} e {servico}.",
  },
  {
    key: "whatsappProperty",
    label: "Mensagem para imóveis",
    type: "textarea",
    help: "Disponíveis: {area}, {titulo} e {link}.",
  },
];
const entranceFields: FieldSpec[] = [
  { key: "entranceBottomNote", label: "Chamada inferior" },
  { key: "entranceBottomText", label: "Texto inferior" },
  { key: "entranceTitle", label: "Título principal", type: "textarea" },
  { key: "entranceText", label: "Descrição para buscadores" },
  { key: "lawTitle", label: "Título — Advocacia" },
  { key: "lawDescription", label: "Descrição — Advocacia", type: "textarea" },
  { key: "lawImage", label: "Imagem — Advocacia", type: "image" },
  { key: "lawButton", label: "Botão — Advocacia" },
  { key: "estateTitle", label: "Título — Imobiliária" },
  {
    key: "estateDescription",
    label: "Descrição — Imobiliária",
    type: "textarea",
  },
  { key: "estateImage", label: "Imagem — Imobiliária", type: "image" },
  { key: "estateButton", label: "Botão — Imobiliária" },
];
const lawFields: FieldSpec[] = [
  { key: "aboutCaption", label: "Legenda da imagem sobre" },
  { key: "teamEyebrow", label: "Chamada da equipe" },
  { key: "servicesEyebrow", label: "Chamada dos serviços" },
  { key: "servicesText", label: "Apresentação dos serviços", type: "textarea" },
  { key: "contactEyebrow", label: "Chamada dos contatos" },
  { key: "contactButton", label: "Botão de contato (duas áreas)" },
  { key: "heroEyebrow", label: "Chamada inicial" },
  { key: "heroTitle", label: "Título inicial", type: "textarea" },
  { key: "heroText", label: "Texto inicial", type: "textarea" },
  { key: "heroImage", label: "Imagem inicial", type: "image" },
  { key: "heroButton", label: "Texto do botão inicial" },
  { key: "aboutEyebrow", label: "Chamada sobre o escritório" },
  { key: "aboutTitle", label: "Título sobre o escritório", type: "textarea" },
  { key: "aboutText", label: "Apresentação do escritório", type: "textarea" },
  { key: "aboutImage", label: "Foto sobre o escritório", type: "image" },
  { key: "teamTitle", label: "Título da equipe" },
  { key: "servicesTitle", label: "Título dos serviços" },
  { key: "contactTitle", label: "Título dos contatos (duas áreas)" },
  {
    key: "contactText",
    label: "Texto dos contatos (duas áreas)",
    type: "textarea",
  },
];
const estateFields: FieldSpec[] = [
  { key: "catalogEyebrow", label: "Chamada da lista de imóveis" },
  { key: "catalogTitle", label: "Título da lista de imóveis" },
  { key: "estateDiscoverButton", label: "Botão de acesso ao catálogo" },
  { key: "propertyButton", label: "Botão de interesse no imóvel" },
  { key: "propertyAboutTitle", label: "Título da descrição do imóvel" },
  { key: "propertyFeaturesTitle", label: "Título das características" },
  { key: "propertyLocationTitle", label: "Título da localização" },
  {
    key: "propertyLocationText",
    label: "Aviso sobre localização",
    type: "textarea",
  },
  {
    key: "propertyPriceNote",
    label: "Aviso abaixo dos valores",
    type: "textarea",
  },
  { key: "estateEyebrow", label: "Chamada do catálogo" },
  { key: "estateTitle", label: "Título do catálogo", type: "textarea" },
  { key: "estateText", label: "Descrição do catálogo", type: "textarea" },
  { key: "estateImage", label: "Imagem do catálogo", type: "image" },
];
function ImageField({
  label,
  value,
  onChange,
  onError,
  append = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onError: (v: string) => void;
  append?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState("");
  const changeRef = useRef(onChange);
  const active = useRef(true);
  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  return (
    <div className="field image-field">
      <label>
        {label}
        <input
          type="text"
          inputMode="url"
          value={append ? pending : value}
          placeholder="https://… ou envie uma imagem"
          onChange={(e) =>
            append ? setPending(e.target.value) : onChange(e.target.value)
          }
        />
      </label>
      <div className="image-input-row">
        {append && (
          <button
            type="button"
            className="button button-outline"
            disabled={!pending.trim()}
            onClick={() => {
              if (!/^https:\/\//.test(pending.trim())) {
                onError("Informe uma URL de imagem começando com https://.");
                return;
              }
              onChange(pending.trim());
              setPending("");
            }}
          >
            Adicionar URL
          </button>
        )}
        {value && <img src={value} alt={`Prévia: ${label}`} />}
        <label className="button button-outline upload-button">
          <ImagePlus size={16} />
          {busy ? "Enviando…" : "Enviar imagem"}
          <input
            aria-label={`Enviar ${label}`}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              try {
                const url = await uploadImage(file);
                if (active.current) changeRef.current(url);
              } catch (err) {
                onError((err as Error).message);
              } finally {
                setBusy(false);
                e.target.value = "";
              }
            }}
          />
        </label>
        <small>JPG, PNG, WebP ou AVIF · até 8 MB</small>
      </div>
    </div>
  );
}
function Fields({
  spec,
  values,
  onChange,
  onError,
}: {
  spec: FieldSpec[];
  values: object;
  onChange: (key: string, value: string) => void;
  onError: (v: string) => void;
}) {
  return (
    <div className="fields-grid">
      {spec.map((f) =>
        f.type === "image" ? (
          <ImageField
            key={f.key}
            label={f.label}
            value={(values as Record<string, string>)[f.key]}
            onChange={(v) => onChange(f.key, v)}
            onError={onError}
          />
        ) : (
          <label
            className={`field ${f.type === "textarea" ? "field-wide" : ""}`}
            key={f.key}
          >
            {f.label}
            {f.type === "textarea" ? (
              <textarea
                aria-label={f.label}
                rows={3}
                value={(values as Record<string, string>)[f.key]}
                onChange={(e) => onChange(f.key, e.target.value)}
              />
            ) : (
              <input
                aria-label={f.label}
                type={f.type ?? "text"}
                value={(values as Record<string, string>)[f.key]}
                onChange={(e) => onChange(f.key, e.target.value)}
              />
            )}
            {f.help && <small>{f.help}</small>}
          </label>
        ),
      )}
    </div>
  );
}
function Auth() {
  const navigate = useNavigate();
  const { demo, authReady, session } = useSite();
  const [preview, setPreview] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [mode, setMode] = useState<"login" | "reset" | "password">(
      new URLSearchParams(location.search).has("recovery")
        ? "password"
        : "login",
    ),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("password");
    });
    return () => data.subscription.unsubscribe();
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (!supabase)
        throw new Error(
          "Configure as variáveis do Supabase e reinicie o projeto.",
        );
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/admin?recovery=1`,
        });
        if (error) throw error;
        setMessage(
          "Se o e-mail estiver cadastrado, você receberá um link de recuperação.",
        );
      } else {
        if (!session)
          throw new Error("Abra o link de recuperação recebido por e-mail.");
        if (password.length < 8)
          throw new Error("Use uma senha com pelo menos 8 caracteres.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        navigate("/admin", { replace: true });
        setMode("login");
        setMessage("Senha atualizada.");
      }
    } catch (err) {
      setMessage(
        mode === "login"
          ? "Não foi possível entrar. Verifique e-mail e senha e tente novamente."
          : (err as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  if (demo && preview) return <Dashboard />;
  if (!authReady)
    return (
      <div className="loading-screen">
        <LoaderCircle className="spin" />
        Verificando acesso…
      </div>
    );
  return (
    <main className="auth-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={16} /> Voltar ao site
      </Link>
      <div className="auth-card">
        <span className="admin-monogram">BB</span>
        <span className="eyebrow">BRAGA E BUZZO</span>
        <h1>
          {mode === "reset"
            ? "Recupere seu acesso."
            : mode === "password"
              ? "Uma nova senha."
              : "Bem-vindo de volta."}
        </h1>
        <p>
          {demo
            ? "Explore o painel e experimente as edições nesta sessão."
            : "Acesse o painel para cuidar do seu site."}
        </p>
        {demo ? (
          <>
            <div className="demo-banner">
              Modo demonstração. Alterações ficam apenas na memória e são
              perdidas ao recarregar. Não há autenticação real nesta prévia.
            </div>
            <button className="button" onClick={() => setPreview(true)}>
              Explorar painel demonstrativo <ArrowRightIcon />
            </button>
          </>
        ) : session && mode !== "password" ? (
          <>
            <p role="alert">Esta conta não tem permissão de administrador.</p>
            <button
              className="button"
              onClick={() => void supabase!.auth.signOut()}
            >
              Sair desta conta
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            {mode !== "password" && (
              <label className="field">
                E-mail
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            )}
            {mode !== "reset" && (
              <label className="field">
                Senha
                <input
                  type="password"
                  autoComplete={
                    mode === "password" ? "new-password" : "current-password"
                  }
                  minLength={mode === "password" ? 8 : undefined}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            )}
            {message && (
              <p role="status" className="form-message">
                {message}
              </p>
            )}
            <button className="button" disabled={busy}>
              {busy
                ? "Aguarde…"
                : mode === "login"
                  ? "Entrar no painel"
                  : mode === "reset"
                    ? "Enviar link de recuperação"
                    : "Salvar nova senha"}
              <ArrowRightIcon />
            </button>
            <button
              type="button"
              className="clear-filters"
              onClick={() => {
                setMessage("");
                setMode(mode === "login" ? "reset" : "login");
              }}
            >
              {mode === "login"
                ? "Esqueci minha senha"
                : "Voltar para o acesso"}
            </button>
          </form>
        )}
      </div>
      <span className="auth-footer">
        UM ESPAÇO PARA CUIDAR DE CADA DETALHE.
      </span>
    </main>
  );
}
function ArrowRightIcon() {
  return <ChevronRight size={17} />;
}
const tabs = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "settings", label: "Configurações", icon: Settings },
  { id: "entrance", label: "Tela de entrada", icon: Home },
  { id: "law", label: "Advocacia", icon: Scale },
  { id: "team", label: "Equipe", icon: Users },
  { id: "services", label: "Serviços", icon: Scale },
  { id: "estate", label: "Apresentação imobiliária", icon: Building2 },
  { id: "properties", label: "Imóveis", icon: Building2 },
];
function Dashboard() {
  const { data, save, demo } = useSite();
  const [draft, setDraft] = useState<SiteData>(() => structuredClone(data!)),
    [tab, setTab] = useState("overview"),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [mobileNav, setMobileNav] = useState(false),
    [propertySearch, setPropertySearch] = useState(""),
    [propertyStatus, setPropertyStatus] = useState("");
  const revision = useRef(0);
  const saving = useRef(false);
  const filteredProperties = draft.properties.filter(
    (p) =>
      (!propertyStatus || p.status === propertyStatus) &&
      slugify(`${p.title} ${p.city} ${p.neighborhood} ${p.id}`).includes(
        slugify(propertySearch),
      ),
  );
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const change = (next: SiteData) => {
    revision.current++;
    setDraft(next);
    setDirty(true);
    setMessage("");
  };
  const setting = (key: string, value: string) =>
    change({ ...draft, settings: { ...draft.settings, [key]: value } });
  const content = (key: string, value: string) =>
    change({ ...draft, content: { ...draft.content, [key]: value } });
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving.current) return;
    saving.current = true;
    const savedRevision = revision.current;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await save(draft);
      setDirty(savedRevision !== revision.current);
      setMessage(
        savedRevision !== revision.current
          ? "Salvo. Há novas alterações no formulário que ainda precisam ser salvas."
          : demo
            ? "Prévia atualizada nesta sessão. Recarregar a página restaura os dados iniciais."
            : "Alterações salvas e publicadas com sucesso.",
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function move<T>(items: T[], i: number, dir: number): T[] {
    const next = [...items];
    if (i + dir < 0 || i + dir >= items.length) return next;
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    return next;
  }
  function remove(kind: "lawyers" | "services" | "properties", id: string) {
    if (
      !confirm(
        "Excluir este cadastro? A exclusão será aplicada ao salvar as alterações.",
      )
    )
      return;
    change({ ...draft, [kind]: draft[kind].filter((x) => x.id !== id) });
    setSelected(null);
  }
  const p = draft.properties.find((p) => p.id === selected);
  function updateProperty(next: Property) {
    change({
      ...draft,
      properties: draft.properties.map((p) => (p.id === next.id ? next : p)),
    });
  }
  const actions = (kind: "lawyers" | "services", id: string, i: number) => (
    <div className="row-actions">
      <button
        type="button"
        aria-label="Mover para cima"
        disabled={i === 0}
        onClick={() =>
          change({
            ...draft,
            [kind]: move(draft[kind] as (Lawyer | Service)[], i, -1),
          })
        }
      >
        <ArrowUp size={15} />
      </button>
      <button
        type="button"
        aria-label="Mover para baixo"
        disabled={i === draft[kind].length - 1}
        onClick={() =>
          change({
            ...draft,
            [kind]: move(draft[kind] as (Lawyer | Service)[], i, 1),
          })
        }
      >
        <ArrowDown size={15} />
      </button>
      <button
        type="button"
        aria-label="Excluir cadastro"
        onClick={() => remove(kind, id)}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
  return (
    <div className="admin-layout">
      <PageMeta
        title={`Painel | ${draft.settings.brand}`}
        description="Painel administrativo"
      />
      <aside
        id="admin-navigation"
        className={`admin-sidebar ${mobileNav ? "sidebar-open" : ""}`}
      >
        <Link
          to="/"
          className="admin-brand"
          onClick={(e) => {
            if (
              dirty &&
              !confirm("Há alterações não salvas. Deseja sair e descartá-las?")
            )
              e.preventDefault();
          }}
        >
          <span className="admin-monogram">BB</span>
          <span>
            Braga e Buzzo<small>PAINEL ADMINISTRATIVO</small>
          </span>
        </Link>
        <div className="sidebar-label">GERENCIAR SITE</div>
        <nav>
          {tabs.map((t) => (
            <button
              type="button"
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => {
                setTab(t.id);
                setSelected(null);
                setMobileNav(false);
              }}
            >
              <t.icon size={18} />
              {t.label}
              <ChevronRight size={14} />
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            to="/"
            onClick={(e) => {
              if (
                dirty &&
                !confirm(
                  "Há alterações não salvas. Deseja sair e descartá-las?",
                )
              )
                e.preventDefault();
            }}
          >
            <Eye size={17} /> Visualizar site <ArrowUpRight size={14} />
          </Link>
          {!demo && (
            <button
              type="button"
              onClick={async () => {
                if (
                  dirty &&
                  !confirm(
                    "Há alterações não salvas. Deseja sair e descartá-las?",
                  )
                )
                  return;
                await supabase!.auth.signOut();
              }}
            >
              <LogOut size={17} /> Sair
            </button>
          )}
          <span>{demo ? "AMBIENTE DEMONSTRATIVO" : "ACESSO RESTRITO"}</span>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="mobile-admin-toggle"
            aria-expanded={mobileNav}
            aria-controls="admin-navigation"
            onClick={() => setMobileNav(!mobileNav)}
          >
            Menu
          </button>
          <span>
            Painel <ChevronRight size={13} />{" "}
            {tabs.find((t) => t.id === tab)?.label}
          </span>
          <Link
            to="/"
            onClick={(e) => {
              if (
                dirty &&
                !confirm(
                  "Há alterações não salvas. Deseja sair e descartá-las?",
                )
              )
                e.preventDefault();
            }}
          >
            Abrir site <ArrowUpRight size={15} />
          </Link>
        </header>
        <form onSubmit={submit} className="admin-content">
          <div className="admin-page-heading">
            <div>
              <span className="eyebrow">SEU SITE, DO SEU JEITO</span>
              <h1>{tabs.find((t) => t.id === tab)?.label}</h1>
              <p>
                {tab === "overview"
                  ? "Tudo o que importa, em um só lugar."
                  : "Atualize os detalhes e salve para aplicar ao site."}
              </p>
            </div>
            <button className="button" type="submit" disabled={busy || !dirty}>
              {busy ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <Save size={17} />
              )}
              {busy
                ? "Salvando…"
                : dirty
                  ? "Salvar alterações"
                  : "Tudo atualizado"}
            </button>
          </div>
          {demo && (
            <div className="demo-banner">
              <span className="status-dot" />
              <strong>Modo demonstração</strong> As alterações ficam apenas
              nesta sessão e serão perdidas ao recarregar.
            </div>
          )}
          {dirty && (
            <div className="unsaved-note">
              Você tem alterações não salvas.{" "}
              <button
                type="button"
                onClick={() => {
                  if (confirm("Descartar todas as alterações não salvas?")) {
                    setDraft(structuredClone(data!));
                    setDirty(false);
                    setError("");
                    setMessage("");
                  }
                }}
              >
                Descartar
              </button>
            </div>
          )}
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button
                type="button"
                aria-label="Fechar aviso"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {message && (
            <div className="alert success" role="status">
              <Check size={18} />
              {message}
            </div>
          )}
          <fieldset disabled={busy} className="admin-fieldset">
            {tab === "overview" && (
              <>
                <div className="stat-grid">
                  {[
                    {
                      label: "Imóveis publicados",
                      value: draft.properties.filter(
                        (p) => p.status === "publicado",
                      ).length,
                      icon: Building2,
                    },
                    {
                      label: "Serviços cadastrados",
                      value: draft.services.length,
                      icon: Scale,
                    },
                    {
                      label: "Perfis da equipe",
                      value: draft.lawyers.length,
                      icon: Users,
                    },
                  ].map((s) => (
                    <div className="stat-card" key={s.label}>
                      <s.icon size={22} />
                      <strong>{s.value}</strong>
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
                <div className="admin-panel welcome-panel">
                  <div>
                    <span className="eyebrow">CADA DETALHE IMPORTA</span>
                    <h2>
                      Seu próximo passo
                      <br />
                      começa por aqui.
                    </h2>
                    <p>
                      Atualize os imóveis, apresente sua equipe e mantenha as
                      informações sempre por perto.
                    </p>
                    <button
                      className="button"
                      type="button"
                      onClick={() => setTab("properties")}
                    >
                      Gerenciar imóveis <ChevronRight size={17} />
                    </button>
                  </div>
                  <Building2 strokeWidth={0.6} />
                </div>
                <div className="admin-panel">
                  <h3>Antes de publicar</h3>
                  <p>
                    Substitua os conteúdos e imóveis demonstrativos, informe os
                    contatos reais e revise a apresentação dos profissionais. O
                    cadastro do Supabase e a hospedagem devem ser configurados
                    conforme o README.
                  </p>
                </div>
              </>
            )}
            {tab === "settings" && (
              <div className="admin-panel">
                <h3>Marca e informações compartilhadas</h3>
                <p>Estes dados são usados nas duas áreas do site.</p>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={draft.settings.showDemoNotice}
                    onChange={(e) =>
                      change({
                        ...draft,
                        settings: {
                          ...draft.settings,
                          showDemoNotice: e.target.checked,
                        },
                      })
                    }
                  />{" "}
                  Exibir avisos de conteúdo demonstrativo no site
                </label>
                <Fields
                  spec={generalFields}
                  values={draft.settings}
                  onChange={setting}
                  onError={setError}
                />
              </div>
            )}
            {tab === "entrance" && (
              <div className="admin-panel">
                <h3>A primeira impressão</h3>
                <Fields
                  spec={entranceFields}
                  values={draft.settings}
                  onChange={setting}
                  onError={setError}
                />
              </div>
            )}
            {tab === "law" && (
              <>
                <div className="admin-panel">
                  <h3>Seções da página</h3>
                  <p>Altere os nomes do menu, a ordem e a visibilidade.</p>
                  {draft.content.sections.map((s, i) => (
                    <div className="section-editor" key={s.id}>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={s.visible}
                          onChange={(e) =>
                            change({
                              ...draft,
                              content: {
                                ...draft.content,
                                sections: draft.content.sections.map((x) =>
                                  x.id === s.id
                                    ? { ...x, visible: e.target.checked }
                                    : x,
                                ),
                              },
                            })
                          }
                        />
                        <input
                          aria-label={`Nome da seção ${s.id}`}
                          value={s.label}
                          onChange={(e) =>
                            change({
                              ...draft,
                              content: {
                                ...draft.content,
                                sections: draft.content.sections.map((x) =>
                                  x.id === s.id
                                    ? { ...x, label: e.target.value }
                                    : x,
                                ),
                              },
                            })
                          }
                        />
                      </label>
                      <div className="row-actions">
                        <button
                          type="button"
                          aria-label={`Subir seção ${s.label}`}
                          disabled={i === 0}
                          onClick={() =>
                            change({
                              ...draft,
                              content: {
                                ...draft.content,
                                sections: move(draft.content.sections, i, -1),
                              },
                            })
                          }
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Descer seção ${s.label}`}
                          disabled={i === draft.content.sections.length - 1}
                          onClick={() =>
                            change({
                              ...draft,
                              content: {
                                ...draft.content,
                                sections: move(draft.content.sections, i, 1),
                              },
                            })
                          }
                        >
                          <ArrowDown size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="admin-panel">
                  <Fields
                    spec={lawFields}
                    values={draft.content}
                    onChange={content}
                    onError={setError}
                  />
                </div>
              </>
            )}
            {(tab === "team" || tab === "services") && (
              <>
                <div className="collection-heading">
                  <p>
                    {tab === "team"
                      ? "Apresente os profissionais do escritório."
                      : "Descreva os serviços oferecidos pelo escritório."}
                  </p>
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => {
                      const id = crypto.randomUUID();
                      if (tab === "team")
                        change({
                          ...draft,
                          lawyers: [
                            ...draft.lawyers,
                            {
                              id,
                              name: "Novo profissional",
                              role: "",
                              bio: "",
                              image: "",
                            },
                          ],
                        });
                      else
                        change({
                          ...draft,
                          services: [
                            ...draft.services,
                            {
                              id,
                              title: "Novo serviço",
                              description: "",
                              button: "Conversar sobre este serviço",
                            },
                          ],
                        });
                    }}
                  >
                    <Plus size={17} />{" "}
                    {tab === "team"
                      ? "Adicionar profissional"
                      : "Adicionar serviço"}
                  </button>
                </div>
                {tab === "team"
                  ? draft.lawyers.map((l, i) => (
                      <div className="admin-panel" key={l.id}>
                        <div className="collection-heading">
                          <h3>{l.name}</h3>
                          {actions("lawyers", l.id, i)}
                        </div>
                        <Fields
                          spec={[
                            { key: "name", label: "Nome" },
                            {
                              key: "role",
                              label: "Cargo e registro profissional",
                            },
                            {
                              key: "bio",
                              label: "Apresentação",
                              type: "textarea",
                            },
                            { key: "image", label: "Foto", type: "image" },
                          ]}
                          values={l}
                          onChange={(key, value) =>
                            change({
                              ...draft,
                              lawyers: draft.lawyers.map((x) =>
                                x.id === l.id ? { ...x, [key]: value } : x,
                              ),
                            })
                          }
                          onError={setError}
                        />
                      </div>
                    ))
                  : draft.services.map((s, i) => (
                      <div className="admin-panel" key={s.id}>
                        <div className="collection-heading">
                          <h3>{s.title}</h3>
                          {actions("services", s.id, i)}
                        </div>
                        <Fields
                          spec={[
                            { key: "title", label: "Nome do serviço" },
                            {
                              key: "description",
                              label: "Descrição",
                              type: "textarea",
                            },
                            { key: "button", label: "Texto do botão" },
                          ]}
                          values={s}
                          onChange={(key, value) =>
                            change({
                              ...draft,
                              services: draft.services.map((x) =>
                                x.id === s.id ? { ...x, [key]: value } : x,
                              ),
                            })
                          }
                          onError={setError}
                        />
                      </div>
                    ))}
              </>
            )}
            {tab === "estate" && (
              <div className="admin-panel">
                <h3>Apresentação do catálogo</h3>
                <Fields
                  spec={estateFields}
                  values={draft.content}
                  onChange={content}
                  onError={setError}
                />
              </div>
            )}
            {tab === "properties" &&
              (p ? (
                <>
                  <div className="collection-heading">
                    <button
                      type="button"
                      className="back-link"
                      onClick={() => setSelected(null)}
                    >
                      <ArrowLeft size={16} /> Todos os imóveis
                    </button>
                    <button
                      className="delete-button"
                      type="button"
                      onClick={() => remove("properties", p.id)}
                    >
                      <Trash2 size={15} /> Excluir imóvel
                    </button>
                  </div>
                  <PropertyEditor
                    property={p}
                    update={updateProperty}
                    onError={setError}
                  />
                </>
              ) : (
                <>
                  <div className="collection-heading">
                    <span>{draft.properties.length} imóveis cadastrados</span>
                    <button
                      type="button"
                      className="button"
                      onClick={() => {
                        const id = crypto.randomUUID();
                        change({
                          ...draft,
                          properties: [
                            {
                              id,
                              slug: `novo-imovel-${id.slice(0, 8)}`,
                              title: "Novo imóvel",
                              description: "",
                              city: "",
                              neighborhood: "",
                              type: "Apartamento",
                              rent: 0,
                              condo: null,
                              tax: null,
                              area: 0,
                              bedrooms: 0,
                              bathrooms: 0,
                              parking: 0,
                              features: [],
                              images: [],
                              status: "rascunho",
                              featured: false,
                            },
                            ...draft.properties,
                          ],
                        });
                        setSelected(id);
                      }}
                    >
                      <Plus size={17} /> Adicionar imóvel
                    </button>
                  </div>
                  <div className="admin-search-filters">
                    <label className="field">
                      Buscar imóveis
                      <input
                        type="search"
                        value={propertySearch}
                        onChange={(e) => setPropertySearch(e.target.value)}
                        placeholder="Título, cidade, bairro ou referência"
                      />
                    </label>
                    <label className="field">
                      Status
                      <select
                        value={propertyStatus}
                        onChange={(e) => setPropertyStatus(e.target.value)}
                      >
                        <option value="">Todos os status</option>
                        {["rascunho", "publicado", "alugado", "arquivado"].map(
                          (status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <span aria-live="polite">
                      {filteredProperties.length} de {draft.properties.length}{" "}
                      imóveis
                    </span>
                  </div>
                  <div className="admin-panel property-table">
                    {filteredProperties.length === 0 ? (
                      <p>
                        Nenhum imóvel encontrado. Ajuste a busca ou o status.
                      </p>
                    ) : (
                      filteredProperties.map((p) => (
                        <button
                          type="button"
                          className="property-row"
                          key={p.id}
                          onClick={() => setSelected(p.id)}
                        >
                          {p.images[0] ? (
                            <img src={p.images[0]} alt="" />
                          ) : (
                            <Building2 />
                          )}
                          <span>
                            <strong>{p.title}</strong>
                            <small>
                              {p.neighborhood} · {p.city}
                            </small>
                          </span>
                          <span className={`status-badge ${p.status}`}>
                            {p.status}
                          </span>
                          <strong>{money(p.rent)}</strong>
                          <ChevronRight size={16} />
                        </button>
                      ))
                    )}
                  </div>
                </>
              ))}
          </fieldset>
          {dirty && (
            <div className="admin-savebar">
              <span>Alterações aguardando salvamento</span>
              <button className="button" type="submit" disabled={busy}>
                <Save size={16} />
                {busy ? "Salvando…" : "Aplicar alterações"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
function PropertyEditor({
  property: p,
  update,
  onError,
}: {
  property: Property;
  update: (p: Property) => void;
  onError: (s: string) => void;
}) {
  const set = (key: keyof Property, value: unknown) =>
    update({ ...p, [key]: value });
  return (
    <>
      <div className="admin-panel">
        <h3>Informações do imóvel</h3>
        <div className="fields-grid">
          <label className="field">
            Título
            <input
              value={p.title}
              required
              onChange={(e) => set("title", e.target.value)}
            />
          </label>
          <label className="field">
            Link do imóvel
            <div className="slug-field">
              <input
                value={p.slug}
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                onChange={(e) => set("slug", e.target.value)}
              />
              <button
                type="button"
                onClick={() => set("slug", slugify(p.title))}
              >
                Gerar
              </button>
            </div>
            <small>Alterar o link invalida links antigos compartilhados.</small>
          </label>
          <label className="field field-wide">
            Descrição
            <textarea
              rows={5}
              value={p.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          {(
            [
              { key: "city", label: "Cidade" },
              { key: "neighborhood", label: "Bairro" },
            ] as const
          ).map((f) => (
            <label className="field" key={f.key}>
              {f.label}
              <input
                value={p[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
              />
            </label>
          ))}
          <label className="field">
            Tipo
            <select
              value={p.type}
              onChange={(e) => set("type", e.target.value)}
            >
              {[
                "Apartamento",
                "Casa",
                "Studio",
                "Sala comercial",
                "Loja",
                "Galpão",
                "Terreno",
                "Outro",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Status
            <select
              value={p.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {["rascunho", "publicado", "alugado", "arquivado"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          {(
            [
              { key: "rent", label: "Aluguel mensal (R$)" },
              { key: "condo", label: "Condomínio mensal (R$)" },
              { key: "tax", label: "IPTU mensal (R$)" },
              { key: "area", label: "Área (m²)" },
              { key: "bedrooms", label: "Quartos" },
              { key: "bathrooms", label: "Banheiros" },
              { key: "parking", label: "Vagas" },
            ] as const
          ).map((f) => (
            <label className="field" key={f.key}>
              {f.label}
              <input
                type="number"
                min="0"
                step={
                  ["bedrooms", "bathrooms", "parking"].includes(f.key)
                    ? "1"
                    : "0.01"
                }
                value={p[f.key] ?? ""}
                onChange={(e) =>
                  set(
                    f.key,
                    e.target.value === "" && ["condo", "tax"].includes(f.key)
                      ? null
                      : Number(e.target.value),
                  )
                }
              />
              {["condo", "tax"].includes(f.key) && (
                <small>
                  Deixe vazio se não informado. Use zero se não houver cobrança.
                </small>
              )}
            </label>
          ))}
          <label className="field">
            Características (uma por linha)
            <textarea
              rows={4}
              value={p.features.join("\n")}
              onChange={(e) => set("features", e.target.value.split("\n"))}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={p.featured}
              onChange={(e) => set("featured", e.target.checked)}
            />{" "}
            Destacar no catálogo
          </label>
        </div>
      </div>
      <div className="admin-panel">
        <h3>Galeria do imóvel</h3>
        <p>
          A primeira imagem será a capa. Use as setas para organizar as fotos.
        </p>
        <div className="admin-gallery">
          {p.images.map((image, i) => (
            <div className="admin-gallery-item" key={`${image}-${i}`}>
              <img src={image} alt={`Foto ${i + 1}`} />
              <div>
                <span>{i === 0 ? "CAPA" : `FOTO ${i + 1}`}</span>
                <div className="row-actions">
                  <button
                    type="button"
                    disabled={i === 0}
                    aria-label={`Mover foto ${i + 1} para esquerda`}
                    onClick={() => {
                      const imgs = [...p.images];
                      [imgs[i - 1], imgs[i]] = [imgs[i], imgs[i - 1]];
                      set("images", imgs);
                    }}
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={i === p.images.length - 1}
                    aria-label={`Mover foto ${i + 1} para direita`}
                    onClick={() => {
                      const imgs = [...p.images];
                      [imgs[i + 1], imgs[i]] = [imgs[i], imgs[i + 1]];
                      set("images", imgs);
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remover foto ${i + 1}`}
                    onClick={() => {
                      if (confirm("Remover esta foto da galeria?"))
                        set(
                          "images",
                          p.images.filter((_, j) => j !== i),
                        );
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <ImageField
          append
          label="Adicionar foto"
          value=""
          onChange={(v) => {
            if (v.trim()) set("images", [...p.images, v.trim()]);
          }}
          onError={onError}
        />
      </div>
    </>
  );
}
export function Admin() {
  const { demo, admin, data, authReady } = useSite();
  const { search } = useLocation();
  const recovery = new URLSearchParams(search).has("recovery");
  if (!authReady)
    return <div className="loading-screen">Verificando acesso…</div>;
  if (!demo && admin && !recovery && data) return <Dashboard />;
  return (
    <>
      <PageMeta
        title="Acesso administrativo | Braga e Buzzo"
        description="Acesso restrito ao painel administrativo"
      />
      <Auth />
    </>
  );
}
