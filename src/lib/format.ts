export const formatKz = (n: number) =>
  `${n.toLocaleString("de-DE")} Kz`;

export const formatDist = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
