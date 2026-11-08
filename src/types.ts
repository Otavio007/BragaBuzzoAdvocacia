export type Area = "Advocacia" | "Imobiliária";
export type Status = "rascunho" | "publicado" | "alugado" | "arquivado";
export interface Settings {
  showDemoNotice: boolean;
  brand: string;
  logo: string;
  primary: string;
  accent: string;
  whatsapp: string;
  phone: string;
  address: string;
  hours: string;
  instagram: string;
  facebook: string;
  mapQuery: string;
  whatsappService: string;
  whatsappProperty: string;
  whatsappGeneral: string;
  entranceEyebrow: string;
  entranceTitle: string;
  entranceText: string;
  lawTitle: string;
  lawDescription: string;
  lawImage: string;
  lawButton: string;
  estateTitle: string;
  estateDescription: string;
  estateImage: string;
  estateButton: string;
  footerText: string;
  entranceHeaderNote: string;
  entranceBottomNote: string;
  entranceBottomText: string;
}
export interface Section {
  id: "inicio" | "sobre" | "equipe" | "servicos" | "contato";
  label: string;
  visible: boolean;
}
export interface Content {
  heroEyebrow: string;
  heroTitle: string;
  heroText: string;
  heroImage: string;
  heroButton: string;
  aboutEyebrow: string;
  aboutTitle: string;
  aboutText: string;
  aboutImage: string;
  teamTitle: string;
  servicesTitle: string;
  contactTitle: string;
  contactText: string;
  estateEyebrow: string;
  estateTitle: string;
  estateText: string;
  estateImage: string;
  catalogEyebrow: string;
  catalogTitle: string;
  estateDiscoverButton: string;
  teamEyebrow: string;
  servicesEyebrow: string;
  servicesText: string;
  aboutCaption: string;
  contactEyebrow: string;
  contactButton: string;
  propertyButton: string;
  propertyAboutTitle: string;
  propertyFeaturesTitle: string;
  propertyLocationTitle: string;
  propertyLocationText: string;
  propertyPriceNote: string;
  sections: Section[];
}
export interface Lawyer {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
}
export interface Service {
  id: string;
  title: string;
  description: string;
  button: string;
}
export interface Property {
  id: string;
  slug: string;
  title: string;
  description: string;
  city: string;
  neighborhood: string;
  type: string;
  rent: number;
  condo: number | null;
  tax: number | null;
  area: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  features: string[];
  status: Status;
  featured: boolean;
  images: string[];
}
export interface SiteData {
  settings: Settings;
  content: Content;
  lawyers: Lawyer[];
  services: Service[];
  properties: Property[];
}
export interface Filters {
  city: string;
  neighborhood: string;
  type: string;
  maxRent: string;
  bedrooms: string;
}
