export type Shop = {
  id: number;
  name: string;
  dist: number;
  rating: number;
  reviews: number;
  status: "open" | "busy" | "closed";
  tier: "premium" | "default" | "budget";
  closesAt: string;
  services: string[];
  price: number;
  address: string;
  lat: number;
  lng: number;
};

export const shops: Shop[] = [
  { id: 1, name: "Kaleba Luxury Barbers", dist: 0.3, rating: 4.9, reviews: 312, status: "open", tier: "premium", closesAt: "21:00", services: ["Fade","Beard","Hot Towel","Package"], price: 6000, address: "Rua Rainha Ginga, Ingombota", lat: -8.8147, lng: 13.2302 },
  { id: 2, name: "Dom Barbeiro", dist: 0.6, rating: 4.7, reviews: 148, status: "open", tier: "premium", closesAt: "21:00", services: ["Fade","Beard","Hot Towel"], price: 4000, address: "Av. 4 de Fevereiro, Luanda", lat: -8.8190, lng: 13.2350 },
  { id: 3, name: "Barbearia Kwanza", dist: 0.9, rating: 4.5, reviews: 97, status: "open", tier: "default", closesAt: "20:00", services: ["Haircut","Shave","Kids"], price: 2500, address: "Bairro Sambizanga, Luanda", lat: -8.8060, lng: 13.2380 },
  { id: 4, name: "Sharp Cuts Studio", dist: 1.3, rating: 4.8, reviews: 203, status: "busy", tier: "premium", closesAt: "22:00", services: ["Braids","Fades","Dreads"], price: 5000, address: "Talatona, Luanda Sul", lat: -8.9180, lng: 13.1800 },
  { id: 5, name: "Barbearia Popular", dist: 1.8, rating: 4.2, reviews: 56, status: "open", tier: "budget", closesAt: "18:00", services: ["Classic","Kids","Shave"], price: 1800, address: "Rangel, Luanda", lat: -8.8290, lng: 13.2460 },
  { id: 6, name: "Metro Barbers", dist: 2.1, rating: 4.6, reviews: 179, status: "open", tier: "default", closesAt: "21:30", services: ["Fade","Beard","Scalp"], price: 3200, address: "Maianga, Luanda", lat: -8.8240, lng: 13.2280 },
  { id: 7, name: "Le Barber Prestige", dist: 2.8, rating: 4.9, reviews: 89, status: "closed", tier: "premium", closesAt: "Opens 09:00", services: ["Luxury","Grooming","Package"], price: 8000, address: "Miramar, Luanda", lat: -8.8100, lng: 13.2210 },
];

export const barbers = [
  { id: 1, name: "João Silva", specialty: "Fades", rating: 4.9, available: true },
  { id: 2, name: "Manuel Costa", specialty: "Beards", rating: 4.8, available: true },
  { id: 3, name: "Pedro Neto", specialty: "Classic", rating: 4.7, available: false },
  { id: 4, name: "Carlos Dias", specialty: "Braids", rating: 4.9, available: true },
];

export const servicesCatalog = [
  { id: "haircut", name: "Corte", duration: 30, price: 2500, icon: "Scissors" },
  { id: "fade", name: "Fade", duration: 45, price: 3500, icon: "Sparkles" },
  { id: "beard", name: "Barba", duration: 25, price: 2000, icon: "Wind" },
  { id: "hot-towel", name: "Toalha Quente", duration: 20, price: 1500, icon: "Flame" },
  { id: "package", name: "Pacote Completo", duration: 75, price: 6000, icon: "Crown" },
];

export const reviews = [
  { id: 1, name: "Ana Pereira", rating: 5, date: "há 2 dias", comment: "Excelente atendimento, corte impecável!" },
  { id: 2, name: "Bruno Lopes", rating: 4, date: "há 1 semana", comment: "Bom serviço, voltarei sem dúvida." },
  { id: 3, name: "Carla Mateus", rating: 5, date: "há 2 semanas", comment: "Os melhores barbeiros de Luanda." },
];
