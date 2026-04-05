import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import CidadeDetailDialog from "@/components/cidades/CidadeDetailDialog";

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

const POPULATION_BANDS = [
  { label: "Até 50 mil", color: "hsl(145 54% 82%)" },
  { label: "50k – 200k", color: "hsl(214 88% 88%)" },
  { label: "200k – 500k", color: "hsl(46 92% 84%)" },
  { label: "500k – 1M", color: "hsl(28 95% 82%)" },
  { label: "+1M", color: "hsl(0 85% 86%)" },
] as const;

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

function getPopulationValue(population: string) {
  return Number(population?.replace(/\D/g, "") || 0);
}

function getPopulationColor(population: string) {
  const pop = getPopulationValue(population);
  if (pop <= 50000) return POPULATION_BANDS[0].color;
  if (pop <= 200000) return POPULATION_BANDS[1].color;
  if (pop <= 500000) return POPULATION_BANDS[2].color;
  if (pop <= 1000000) return POPULATION_BANDS[3].color;
  return POPULATION_BANDS[4].color;
}

export default function Mapa() {
  const { tenantId } = useTenant();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Record<string, L.CircleMarker>>({});
  const [search, setSearch] = useState("");
  const [tenantState, setTenantState] = useState("SP");
  const [cidadesCoords, setCidadesCoords] = useState<CidadeWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [focusedCityId, setFocusedCityId] = useState<string | null>(null);
  const [detailCity, setDetailCity] = useState<CidadeWithCoords | null>(null);
  const [mapReady, setMapReady] = useState(false);

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

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    supabase
      .from("cidades")
      .select("id, name, population, regiao, demandas, emendas, liderancas, latitude, longitude")
      .eq("tenant_id", tenantId)
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          toast.error("Não foi possível carregar o mapa");
          setLoading(false);
          return;
        }

        const cities = (data || []) as CidadeWithCoords[];
        setCidadesCoords(cities);

        const missing = cities.filter((city) => city.latitude == null || city.longitude == null);
        if (missing.length > 0) {
          void geocodeCities(missing, tenantState);
        }

        setLoading(false);
      });
  }, [tenantId, tenantState]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const center = STATE_CENTERS[tenantState] || STATE_CENTERS.SP;
    const map = L.map(mapElementRef.current, {
      zoomControl: true,
      preferCanvas: true,
    }).setView([center.lat, center.lng], center.zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);

    return () => {
      markersLayerRef.current?.clearLayers();
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      markersRef.current = {};
      setMapReady(false);
    };
  }, [tenantState]);

  useEffect(() => {
    const center = STATE_CENTERS[tenantState] || STATE_CENTERS.SP;
    mapRef.current?.setView([center.lat, center.lng], center.zoom, { animate: true });
  }, [tenantState]);

  const mappableCities = useMemo(
    () => cidadesCoords.filter((city) => city.latitude != null && city.longitude != null),
    [cidadesCoords],
  );

  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return mappableCities.filter((city) => city.name.toLowerCase().includes(term)).slice(0, 8);
  }, [mappableCities, search]);

  useEffect(() => {
    if (!mapReady || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    markersRef.current = {};

    mappableCities.forEach((city) => {
      const marker = L.circleMarker([city.latitude!, city.longitude!], {
        radius: focusedCityId === city.id ? 12 : 9,
        fillColor: getPopulationColor(city.population),
        color: "hsl(210 20% 22%)",
        weight: focusedCityId === city.id ? 3 : 2,
        opacity: 1,
        fillOpacity: 0.95,
      });

      marker.bindTooltip(city.name, {
        direction: "top",
        offset: [0, -10],
        opacity: 0.95,
      });

      marker.on("click", () => setDetailCity(city));
      marker.on("mouseover", () => marker.openTooltip());
      marker.addTo(markersLayerRef.current!);
      markersRef.current[city.id] = marker;
    });

    if (focusedCityId && markersRef.current[focusedCityId]) {
      markersRef.current[focusedCityId].openTooltip();
    }
  }, [mapReady, mappableCities, focusedCityId]);

  const geocodeCities = async (cities: CidadeWithCoords[], estado: string) => {
    setGeocoding(true);
    const updatedCities = [...cidadesCoords];
    let updatedCount = 0;

    for (const city of cities) {
      const parts = city.name.split("/");
      const cityName = parts[0].trim();
      const cityState = parts.length > 1 ? parts[1].trim() : estado;

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${cityName}, ${cityState}, Brasil`)}&format=json&limit=1`,
          { headers: { "User-Agent": "MandatoGov/1.0" } },
        );
        const results = await response.json();

        if (results.length > 0) {
          const latitude = Number.parseFloat(results[0].lat);
          const longitude = Number.parseFloat(results[0].lon);

          await supabase
            .from("cidades")
            .update({ latitude, longitude } as never)
            .eq("id", city.id);

          const index = updatedCities.findIndex((item) => item.id === city.id);
          if (index >= 0) {
            updatedCities[index] = { ...updatedCities[index], latitude, longitude };
          }

          updatedCount += 1;
        }

        await new Promise((resolve) => setTimeout(resolve, 1100));
      } catch (error) {
        console.error("Erro ao geocodificar cidade", cityName, error);
      }
    }

    if (updatedCount > 0) {
      setCidadesCoords(updatedCities);
      toast.success(`${updatedCount} cidades geocodificadas com sucesso`);
    }

    setGeocoding(false);
  };

  const handleSearchSelect = (city: CidadeWithCoords) => {
    setSearch("");
    setFocusedCityId(city.id);
    mapRef.current?.flyTo([city.latitude!, city.longitude!], 11, { animate: true, duration: 1.2 });
    window.setTimeout(() => markersRef.current[city.id]?.openTooltip(), 400);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-4">
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
            onChange={(event) => setSearch(event.target.value)}
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
                  <span className="ml-auto text-xs text-muted-foreground">{city.population || "N/D"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {POPULATION_BANDS.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full border shadow-sm"
              style={{ backgroundColor: item.color, borderColor: "hsl(0 0% 100%)" }}
            />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
        <span className="text-muted-foreground ml-2">{mappableCities.length} cidades mapeadas</span>
      </div>

      <div className="flex-1 rounded-xl overflow-hidden border shadow-sm relative bg-muted/40">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        <div ref={mapElementRef} className="h-full w-full" style={{ zIndex: 0 }} />
      </div>

      <CidadeDetailDialog
        open={!!detailCity}
        onOpenChange={(open) => {
          if (!open) setDetailCity(null);
        }}
        cidade={detailCity}
      />
    </div>
  );
}
