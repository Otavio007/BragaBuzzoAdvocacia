import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Clock3,
  ArrowUpRight,
  Scale,
  Building2,
  MapPin,
  BedDouble,
  Bath,
  Car,
  Maximize,
  SlidersHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Minus,
} from "lucide-react";
import { useSite } from "./site-context";
import {
  Brand,
  Contact,
  Footer,
  Header,
  NotFound,
  PageMeta,
  WhatsApp,
  Biography,
} from "./components";
import { filterProperties, money } from "./lib/domain";
import type { Filters, Property } from "./types";
export function Entrance() {
  const { data } = useSite();
  const s = data!.settings;
  return (
    <div className="entrance-page">
      <img className="entrance-background" src={s.lawImage} alt="" fetchPriority="high" />
      <PageMeta
        title={`${s.brand} | Advocacia e Imobiliária`}
        description={s.entranceText}
      />
      <header className="entrance-header container">
        <Brand />
      </header>
      <main className="entrance-main container">
        <div className="entrance-intro">
          <h1>{s.entranceTitle}</h1>
        </div>
        <div className="choice-grid">
          {[
            {
              path: "/advocacia",
              title: s.lawTitle,
              description: s.lawDescription,
              button: s.lawButton,
              Icon: Scale,
              label: "01 / ADVOCACIA",
            },
            {
              path: "/imobiliaria",
              title: s.estateTitle,
              description: s.estateDescription,
              button: s.estateButton,
              Icon: Building2,
              label: "02 / IMOBILIÁRIA",
            },
          ].map(({ path, title, description, button, Icon, label }) => (
            <Link to={path} className="choice-card" key={path}>
              <div className="choice-shade" />
              <div className="choice-top">
                <span>{label}</span>
                <span className="choice-icon">
                  <Icon size={22} strokeWidth={1.3} />
                </span>
              </div>
              <div className="choice-content">
                <h2>{title}</h2>
                <p>{description}</p>
                <div className="choice-action">
                  <span>{button}</span>
                  <span className="circle-arrow">
                    <ArrowUpRight size={23} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="entrance-contact">
          <div><MapPin size={19} aria-hidden="true" /><div><strong>Nosso endereço</strong><p>{s.address}</p></div></div>
          <div><Clock3 size={19} aria-hidden="true" /><div><strong>Horário de funcionamento</strong><p>{s.hours}</p></div></div>
        </div>
      </main>
      <div className="entrance-footer container">
        <span>
          © {new Date().getFullYear()} {s.brand}
        </span>
        <span>
          Advocacia & Imobiliária
          {s.showDemoNotice && (
            <>
              {" "}
              <span className="tiny-dot">·</span> Conteúdo demonstrativo
            </>
          )}
        </span>
      </div>
    </div>
  );
}
export function Law() {
  const { data } = useSite();
  const c = data!.content;
  const [expanded, setExpanded] = useState<string | null>(null);
  const sections = {
    inicio: (
      <section id="inicio" className="law-hero">
        <img
          src={c.heroImage}
          alt="Fachada da Braga e Buzzo"
        />
        <div className="law-hero-shade" />
        <div className="container law-hero-inner">
          <span className="eyebrow light">{c.heroEyebrow}</span>
          <h1>{c.heroTitle}</h1>
          {c.heroText && <p>{c.heroText}</p>}
          <WhatsApp area="Advocacia" className="button button-cream">
            {c.heroButton}
            <ArrowUpRight size={17} />
          </WhatsApp>
          {c.sections.some((s) => s.id === "sobre" && s.visible) && (
            <a href="#sobre" className="hero-scroll">
              CONHEÇA NOSSO ESCRITÓRIO <span>↓</span>
            </a>
          )}
        </div>
      </section>
    ),
    sobre: (
      <section id="sobre" className="section">
        <div className="container about-grid">
          <div className="about-image">
            <img
              src={c.aboutImage}
              alt="Fachada da sede da Braga e Buzzo"
              loading="lazy"
            />
            <span className="image-caption">{c.aboutCaption}</span>
          </div>
          <div>
            <span className="eyebrow">{c.aboutEyebrow}</span>
            <h2>{c.aboutTitle}</h2>
            <p className="body-copy">{c.aboutText}</p>
            <span className="signature">{data!.settings.brand}</span>
          </div>
        </div>
      </section>
    ),
    equipe: (
      <section id="equipe" className="section team-section">
        <div className="container">
          <span className="eyebrow">{c.teamEyebrow}</span>
          <h2>{c.teamTitle}</h2>
          <div className="team-grid">
            {data!.lawyers.map((l) => (
              <article className="team-card" key={l.id}>
                <img src={l.image} alt={l.name} loading="lazy" />
                <div>
                  <span className="eyebrow">{l.role}</span>
                  <h3>{l.name}</h3>
                  <Biography text={l.bio} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    ),
    servicos: (
      <section id="servicos" className="section">
        <div className="container services-grid">
          <div>
            <span className="eyebrow">{c.servicesEyebrow}</span>
            <h2>{c.servicesTitle}</h2>
            <p className="muted preserve-lines">{c.servicesText}</p>
          </div>
          <div className="service-list">
            {data!.services.map((s, i) => (
              <article
                key={s.id}
                className={`service-item ${expanded === s.id ? "expanded" : ""}`}
              >
                {s.description ? (
                  <button
                    aria-expanded={expanded === s.id}
                    onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                  >
                    <span className="service-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3>{s.title}</h3>
                    {expanded === s.id ? (
                      <Minus size={20} />
                    ) : (
                      <Plus size={20} />
                    )}
                  </button>
                ) : (
                  <div className="service-heading">
                    <span className="service-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3>{s.title}</h3>
                  </div>
                )}
                <div className="service-body">
                  {s.description && <p>{s.description}</p>}
                  <WhatsApp
                    area="Advocacia"
                    service={s.title}
                    className="text-link"
                    icon={false}
                  >
                    {s.button}
                    <ArrowUpRight size={16} />
                  </WhatsApp>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    ),
    contato: <Contact area="Advocacia" />,
  };
  return (
    <>
      <PageMeta
        title={`Advocacia | ${data!.settings.brand}`}
        description={c.heroText || c.aboutText.split("\n\n")[0]}
      />
      <Header area="Advocacia" />
      <main>
        {c.sections
          .filter((s) => s.visible)
          .map((s) => (
            <div key={s.id}>{sections[s.id]}</div>
          ))}
      </main>
      <Footer area="Advocacia" />
    </>
  );
}
export function PropertyCard({ property: p }: { property: Property }) {
  return (
    <Link to={`/imobiliaria/imoveis/${p.slug}`} className="property-card">
      <div className="property-image">
        <img src={p.images[0]} alt={p.title} loading="lazy" />
        <span className="property-tag">{p.type}</span>
        {p.featured && <span className="featured-tag">DESTAQUE</span>}
        <span className="property-open">
          <ArrowUpRight size={22} />
        </span>
      </div>
      <div className="property-info">
        <span className="location">
          <MapPin size={13} />
          {p.neighborhood} · {p.city}
        </span>
        <h3>{p.title}</h3>
        <div className="property-specs">
          <span>
            <Maximize />
            {p.area} m²
          </span>
          {p.bedrooms > 0 && (
            <span>
              <BedDouble />
              {p.bedrooms} quartos
            </span>
          )}
          <span>
            <Car />
            {p.parking} {p.parking === 1 ? "vaga" : "vagas"}
          </span>
        </div>
        <div className="property-price">
          <strong>
            {money(p.rent)}
            <small> / mês</small>
          </strong>
          <span>
            Ver imóvel <ArrowRight size={15} />
          </span>
        </div>
      </div>
    </Link>
  );
}
const emptyFilters: Filters = {
  city: "",
  neighborhood: "",
  type: "",
  maxRent: "",
  bedrooms: "",
};
export function Estate() {
  const { data } = useSite();
  const c = data!.content;
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sort, setSort] = useState("destaques");
  const [showFilters, setShowFilters] = useState(false);
  const publicItems = data!.properties.filter((p) => p.status === "publicado");
  const items = filterProperties(publicItems, filters).sort((a, b) =>
    sort === "menor"
      ? a.rent - b.rent
      : sort === "maior"
        ? b.rent - a.rent
        : Number(b.featured) - Number(a.featured),
  );
  const set = (key: keyof Filters, value: string) =>
    setFilters((old) => ({
      ...old,
      [key]: value,
      ...(key === "city" ? { neighborhood: "" } : {}),
    }));
  const options = (key: "city" | "neighborhood" | "type") =>
    [
      ...new Set(
        publicItems
          .filter(
            (p) =>
              key !== "neighborhood" ||
              !filters.city ||
              p.city === filters.city,
          )
          .map((p) => p[key]),
      ),
    ].sort();
  return (
    <>
      <PageMeta
        title={`Imóveis para alugar | ${data!.settings.brand}`}
        description={c.estateText}
      />
      <Header area="Imobiliária" />
      <main>
        <section className="estate-hero">
          <div className="estate-hero-image">
            <img
              src={c.estateImage}
              alt="Fachada da sede Braga e Buzzo, advocacia e imobiliária"
            />
          </div>
          <div className="container estate-hero-content">
            <span className="eyebrow">{c.estateEyebrow}</span>
            <h1>{c.estateTitle}</h1>
            <p>{c.estateText}</p>
            <a className="text-link" href="#imoveis">
              {c.estateDiscoverButton} <ArrowRight size={18} />
            </a>
          </div>
        </section>
        <section id="imoveis" className="section catalog">
          <div className="container">
            <div className="catalog-heading">
              <div>
                <span className="eyebrow">{c.catalogEyebrow}</span>
                <h2>{c.catalogTitle}</h2>
              </div>
              <button
                className="button button-outline filter-toggle"
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
              >
                <SlidersHorizontal size={16} /> Filtros
              </button>
            </div>
            <form
              className={`filters ${showFilters ? "filters-open" : ""}`}
              onSubmit={(e) => e.preventDefault()}
            >
              <label>
                Cidade
                <select
                  value={filters.city}
                  onChange={(e) => set("city", e.target.value)}
                >
                  <option value="">Todas as cidades</option>
                  {options("city").map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label>
                Bairro
                <select
                  value={filters.neighborhood}
                  onChange={(e) => set("neighborhood", e.target.value)}
                >
                  <option value="">Todos os bairros</option>
                  {options("neighborhood").map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label>
                Tipo de imóvel
                <select
                  value={filters.type}
                  onChange={(e) => set("type", e.target.value)}
                >
                  <option value="">Todos os tipos</option>
                  {options("type").map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label>
                Aluguel até
                <select
                  value={filters.maxRent}
                  onChange={(e) => set("maxRent", e.target.value)}
                >
                  <option value="">Qualquer valor</option>
                  {[2000, 3000, 4000, 5000, 8000, 12000].map((v) => (
                    <option value={v} key={v}>
                      {money(v)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quartos
                <select
                  value={filters.bedrooms}
                  onChange={(e) => set("bedrooms", e.target.value)}
                >
                  <option value="">Qualquer</option>
                  {[1, 2, 3, 4].map((n) => (
                    <option value={n} key={n}>
                      {n} ou mais
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="clear-filters"
                type="button"
                onClick={() => setFilters(emptyFilters)}
              >
                Limpar filtros
              </button>
            </form>
            <div className="catalog-toolbar">
              <span aria-live="polite">
                {items.length}{" "}
                {items.length === 1
                  ? "imóvel disponível"
                  : "imóveis disponíveis"}
              </span>
              <label>
                Ordenar por{" "}
                <select
                  aria-label="Ordenar imóveis"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="destaques">Destaques</option>
                  <option value="menor">Menor aluguel</option>
                  <option value="maior">Maior aluguel</option>
                </select>
              </label>
            </div>
            {items.length ? (
              <div className="property-grid">
                {items.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Search size={32} />
                <h3>Ainda não encontramos esse espaço.</h3>
                <p>
                  Experimente ajustar os filtros para descobrir outras
                  possibilidades.
                </p>
                <button
                  className="button button-outline"
                  onClick={() => setFilters(emptyFilters)}
                >
                  Limpar filtros
                </button>
              </div>
            )}
            {data!.settings.showDemoNotice && (
              <p className="demo-note">
                Anúncios demonstrativos. Imagens, valores e características
                ilustrativos.
              </p>
            )}
          </div>
        </section>
        <Contact area="Imobiliária" />
      </main>
      <Footer area="Imobiliária" />
    </>
  );
}
export function PropertyDetail() {
  const { slug } = useParams();
  const { data } = useSite();
  const p = data!.properties.find(
    (p) => p.slug === slug && p.status === "publicado",
  );
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [slug]);
  if (!p)
    return (
      <>
        <Header area="Imobiliária" />
        <NotFound />
        <Footer area="Imobiliária" />
      </>
    );
  const next = (n: number) =>
    setIndex((i) => (i + n + p.images.length) % p.images.length);
  return (
    <>
      <PageMeta
        title={`${p.title} | ${data!.settings.brand}`}
        description={`${p.type} para alugar em ${p.neighborhood}, ${p.city}. ${p.area} m². ${money(p.rent)}/mês.`}
      />
      <Header area="Imobiliária" />
      <main className="property-detail container">
        <Link to="/imobiliaria#imoveis" className="back-link">
          <ChevronLeft size={16} /> Voltar para imóveis
        </Link>
        <div className="detail-title">
          <div>
            <span className="eyebrow">{p.type} · PARA ALUGAR</span>
            <h1>{p.title}</h1>
            <p className="location">
              <MapPin size={15} />
              {p.neighborhood} · {p.city}
            </p>
          </div>
          <span className="detail-reference">
            REF. {p.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
        <div className="gallery">
          <img
            className="gallery-main"
            src={p.images[index]}
            alt={`${p.title} — foto ${index + 1}`}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") next(-1);
              if (e.key === "ArrowRight") next(1);
            }}
            tabIndex={0}
          />
          {p.images.length > 1 && (
            <>
              <button
                className="gallery-prev"
                onClick={() => next(-1)}
                aria-label="Foto anterior"
              >
                <ChevronLeft />
              </button>
              <button
                className="gallery-next"
                onClick={() => next(1)}
                aria-label="Próxima foto"
              >
                <ChevronRight />
              </button>
            </>
          )}
          <span className="gallery-count" aria-live="polite">
            {index + 1} / {p.images.length}
          </span>
        </div>
        <div className="gallery-thumbs">
          {p.images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              onClick={() => setIndex(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-pressed={index === i}
              className={index === i ? "selected" : ""}
            >
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
        <div className="detail-columns">
          <div>
            <div className="detail-specs">
              <span>
                <Maximize />
                <strong>{p.area} m²</strong>Área
              </span>
              <span>
                <BedDouble />
                <strong>{p.bedrooms}</strong>Quartos
              </span>
              <span>
                <Bath />
                <strong>{p.bathrooms}</strong>Banheiros
              </span>
              <span>
                <Car />
                <strong>{p.parking}</strong>Vagas
              </span>
            </div>
            <h2>{data!.content.propertyAboutTitle}</h2>
            <p className="body-copy">{p.description}</p>
            <h3>{data!.content.propertyFeaturesTitle}</h3>
            <ul className="features">
              {p.features.map((f, i) => (
                <li key={i}>
                  <Check size={17} />
                  {f}
                </li>
              ))}
            </ul>
            <div className="approx-location">
              <MapPin />
              <div>
                <h3>{data!.content.propertyLocationTitle}</h3>
                <p>
                  {p.neighborhood}, {p.city}.{" "}
                  {data!.content.propertyLocationText}
                </p>
                <a
                  className="text-link"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.neighborhood}, ${p.city}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Explorar a região <ArrowUpRight size={15} />
                </a>
              </div>
            </div>
          </div>
          <aside className="rental-box">
            <span className="eyebrow">ALUGUEL MENSAL</span>
            <strong className="rental-price">
              {money(p.rent)}
              <small>/ mês</small>
            </strong>
            <dl>
              <div>
                <dt>Aluguel</dt>
                <dd>{money(p.rent)}</dd>
              </div>
              {p.condo !== null && (
                <div>
                  <dt>Condomínio</dt>
                  <dd>{money(p.condo)}</dd>
                </div>
              )}
              {p.tax !== null && (
                <div>
                  <dt>IPTU mensal</dt>
                  <dd>{money(p.tax)}</dd>
                </div>
              )}
              <div className="total">
                <dt>Total mensal informado</dt>
                <dd>{money(p.rent + (p.condo ?? 0) + (p.tax ?? 0))}</dd>
              </div>
            </dl>
            <WhatsApp
              area="Imobiliária"
              title={p.title}
              link={`${window.location.origin}/imobiliaria/imoveis/${p.slug}`}
            >
              {data!.content.propertyButton} <ArrowUpRight size={17} />
            </WhatsApp>
            <p className="preserve-lines">{data!.content.propertyPriceNote}</p>
            {data!.settings.showDemoNotice && (
              <span className="demo-note">Imóvel demonstrativo</span>
            )}
          </aside>
        </div>
      </main>
      <Contact area="Imobiliária" />
      <Footer area="Imobiliária" />
    </>
  );
}
