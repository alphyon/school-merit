/**
 * Convierte un texto en MAYÚSCULAS a formato Título (Ej: CARLOS -> Carlos)
 */
export const capitalizeName = (name: string): string => {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
