import { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { useCidades } from "@/hooks/use-cidades";
import { useLiderancas } from "@/hooks/use-liderancas";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Users, FileText, Landmark, Phone, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import CidadeDetailDialog from "@/components/cidades/CidadeDetailDialog";

// Fix default marker icon issue with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// State centers for Brazil
const STATE_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  AC: { lat: -9.0238, lng: -70.812, zoom: 7 },
  AL: { lat: -9.5713, lng: -36.782, zoom: 8 },
  AM: { lat: -3.4168, lng: -65.8561, zoom: 6 },
  AP: { lat: 1.4102, lng: -51.7694, zoom: 7 },
  BA: { lat: -12.9714, lng: -41.6883, zoom: 7 },
  CE: { lat: -5.4984, lng: -39.3206, zoom: 8 },
  DF: { lat: -15.7998, lng: -47.8645, zoom: 10 },
  ES: { lat: -19.1834, lng: -40.3089, zoom: 8 },
  GO: { lat: -15.827, lng: -49.8362, zoom: 7 },
  MA: { lat: -4.9609, lng: -45.2744, zoom: 7 },
  MG: { lat: -18.5122, lng: -44.555, zoom: 7 },
  MS: { lat: -20.7722, lng: -54.7852, zoom: 7 },
  MT: { lat: -12.6818, lng: -56.9211, zoom: 6 },
  PA: { lat: -3.4168, lng: -52.2137, zoom: 6 },
  PB: { lat: -7.24, lng: -36.782, zoom: 8 },
  PE: { lat: -8.8137, lng: -36.9541, zoom: 8 },
  PI: { lat: -7.4742, lng: -42.6818, zoom: 7 },
  PR: { lat: -24.8918, lng: -51.5571, zoom: 7 },
  RJ: { lat: -22.2533, lng: -43.0592, zoom: 8 },
  RN: { lat: -5.4026, lng: -36.9541, zoom: 8 },
  RO: { lat: -11.5057, lng: -63.5806, zoom: 7 },
  RR: { lat: 2.7376, lng: -62.0751, zoom: 7 },
  RS: { lat: -30.0346, lng: -51.2177, zoom: 7 },
  SC: { lat: -27.2423, lng: -50.2189, zoom: 8 },
  SE: { lat: -10.5741, lng: -37.3857, zoom: 9 },
  SP: { lat: -22.2867, lng: -48.857, zoom: 7 },
  TO: { lat: -10.1753, lng: -48.2982, zoom: 7 },
};

function getPopulationColor(pop: number): string {
  if (pop <= 50000) return "#22c55e";
  if (pop <= 200000) return "#3b82f6";
  if (pop <= 500000) return "#eab308";
  if (pop <= 1000000) return "#f97316";
  return "#ef4444";
}

function getPopulationLabel(pop: number): string {
  if (pop <= 50000) return "Pequena";
  if (pop <= 200000) return "Média";
  if (pop <= 500000) return "Grande";
  if (pop <= 1000000) return "Metrópole Regional";
  return "Metrópole";
}

function createColorIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50%; 
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "><div style="width: 8px; height: 8px; border-radius: 50%; background: white;"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

// Component to recenter map
function RecenterMap({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: true });
  }, [lat, lng, zoom, map]);
  return null;
}

// Component to fly to a city
function FlyToCity({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.flyTo([lat, lng], 13, { animate: true, duration: 1.5 });
    }
  }, [lat, lng, map]);
  return null;
}

interface CidadeWithCoords {
  id: string;
  name: string;
  population: string;
  regiao: string;
  demandas: number;
  emendas: number;
  liderancas: number;
  latitude: number | null;
  longitude: number | null;
}

export default function Mapa() {
  const { tenantId } = useTenant();
  const { cidades } = useCidades();
  const { liderancas } = useLiderancas();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tenantState, setTenantState] = useState<string>("SP");
  const [cidadesCoords, setCidadesCoords] = useState<CidadeWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [detailCity, setDetailCity] = useState<CidadeWithCoords | null>(null);

  // Fetch tenant state
  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("tenants")
      .select("estado")
      .eq("id", tenantId)
      .single()
      .then(({ data }) => {
        if (data?.estado) setTenantState(data.estado);
      });
  }, [tenantId]);

  // Fetch cities with coordinates
  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    supabase
      .from("cidades")
      .select("id, name, population, regiao, demandas, emendas, liderancas, latitude, longitude")
      .eq("tenant_id", tenantId)
      .then(({ data, error }) => {
        if (!error && data) {
          setCidadesCoords(data as CidadeWithCoords[]);
          // Geocode missing ones
          const missing = data.filter((c: any) => c.latitude == null || c.longitude == null);
          if (missing.length > 0) {
            geocodeCities(missing as CidadeWithCoords[], tenantState);
          }
        }
        setLoading(false);
      });
  }, [tenantId, tenantState]);

  const geocodeCities = async (cities: CidadeWithCoords[], estado: string) => {
    setGeocoding(true);
    let updated = 0;
    for (const city of cities) {
      const cityName = city.name.split("/")[0].trim();
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName + ", " + estado + ", Brazil")}&format=json&limit=1`,
          { headers: { "User-Agent": "MandatoGov/1.0" } }
        );
        const results = await res.json();
        if (results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lon = parseFloat(results[0].lon);
          await supabase
            .from("cidades")
            .update({ latitude: lat, longitude: lon } as any)
            .eq("id", city.id);
          city.latitude = lat;
          city.longitude = lon;
          updated++;
        }
        // Rate limiting for Nominatim
        await new Promise((r) => setTimeout(r, 1100));
      } catch (e) {
        console.error("Geocode error for", cityName, e);
      }
    }
    if (updated > 0) {
      setCidadesCoords((prev) => [...prev]);
      toast.success(`${updated} cidades geocodificadas com sucesso`);
    }
    setGeocoding(false);
  };

  const center = STATE_CENTERS[tenantState] || STATE_CENTERS.SP;

  const mappableCities = useMemo(
    () => cidadesCoords.filter((c) => c.latitude != null && c.longitude != null),
    [cidadesCoords]
  );

  const filteredCities = useMemo(() => {
    if (!search.trim()) return mappableCities;
    const s = search.toLowerCase();
    return mappableCities.filter((c) => c.name.toLowerCase().includes(s));
  }, [mappableCities, search]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const s = search.toLowerCase();
    return mappableCities.filter((c) => c.name.toLowerCase().includes(s)).slice(0, 8);
  }, [mappableCities, search]);

  const handleSearchSelect = (city: CidadeWithCoords) => {
    if (city.latitude && city.longitude) {
      setFlyTarget({ lat: city.latitude, lng: city.longitude });
      setSearch("");
    }
  };

  const handleMarkerClick = (city: CidadeWithCoords) => {
    setDetailCity(city);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            Mapa
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualização geográfica das cidades • {tenantState}
            {geocoding && (
              <span className="ml-2 inline-flex items-center gap-1 text-primary">
                <Loader2 className="h-3 w-3 animate-spin" /> Geocodificando...
              </span>
            )}
          </p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cidade no mapa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-[1000] max-h-60 overflow-y-auto">
              {searchResults.map((city) => (
                <button
                  key={city.id}
                  className="w-full text-left px-4 py-2 hover:bg-accent/50 text-sm flex items-center gap-2 transition-colors"
                  onClick={() => handleSearchSelect(city)}
                >
                  <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{city.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{city.population}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { color: "#22c55e", label: "Até 50 mil" },
          { color: "#3b82f6", label: "50k – 200k" },
          { color: "#eab308", label: "200k – 500k" },
          { color: "#f97316", label: "500k – 1M" },
          { color: "#ef4444", label: "+1M" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full border border-white shadow-sm"
              style={{ background: item.color }}
            />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
        <span className="text-muted-foreground ml-2">
          {mappableCities.length} cidades mapeadas
        </span>
      </div>

      {/* Map */}
      <div className="flex-1 rounded-xl overflow-hidden border shadow-sm relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={center.zoom}
            className="h-full w-full"
            style={{ height: "100%", width: "100%", background: "hsl(var(--muted))" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap lat={center.lat} lng={center.lng} zoom={center.zoom} />
            {flyTarget && <FlyToCity lat={flyTarget.lat} lng={flyTarget.lng} />}
            {filteredCities.map((city) => {
              const pop = parseInt(city.population?.replace(/\D/g, "") || "0");
              const color = getPopulationColor(pop);
              const label = getPopulationLabel(pop);
              return (
                <Marker
                  key={city.id}
                  position={[city.latitude!, city.longitude!]}
                  icon={createColorIcon(color)}
                  eventHandlers={{
                    click: () => handleMarkerClick(city),
                  }}
                >
                  <Popup>
                    <div className="text-sm min-w-[180px]">
                      <p className="font-bold text-base">{city.name}</p>
                      <p className="text-gray-500">Pop: {city.population || "N/D"}</p>
                      <p className="text-gray-500">{label}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-600">
                        <span>📋 {city.demandas} demandas</span>
                        <span>👥 {city.liderancas} lideranças</span>
                      </div>
                      <button
                        className="mt-2 text-xs text-blue-600 underline"
                        onClick={() => handleMarkerClick(city)}
                      >
                        Ver detalhes →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Detail Dialog */}
      <CidadeDetailDialog
        open={!!detailCity}
        onOpenChange={(v) => !v && setDetailCity(null)}
        cidade={detailCity}
      />
    </div>
  );
}
