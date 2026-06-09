const KEY = "cutnear_client_id";
const NAME_KEY = "cutnear_client_name";

export function getClientId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? `c_${Math.random().toString(36).slice(2)}_${Date.now()}`);
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getClientName(): string {
  return localStorage.getItem(NAME_KEY) || "Convidado";
}

export function setClientName(name: string) {
  localStorage.setItem(NAME_KEY, name);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("") || "👤";
}
