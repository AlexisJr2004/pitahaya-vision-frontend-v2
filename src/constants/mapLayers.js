export const TILE_LAYERS = {
  street: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap contributors', subdomains: 'abc', maxNativeZoom: 19, maxZoom: 21 },
  satellite: { url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', attribution: '© Google', subdomains: '0123', maxNativeZoom: 20, maxZoom: 21 },
  terrain: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: '© OpenTopoMap contributors', subdomains: 'abc', maxNativeZoom: 17, maxZoom: 21 },
}
