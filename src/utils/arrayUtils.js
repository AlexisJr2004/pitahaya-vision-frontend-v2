export function toArray(d) {
  return Array.isArray(d) ? d : (d?.results ?? [])
}
