import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, MapPin, Clock, Plus, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useEventos } from "@/hooks/use-eventos";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import NovoEventoDialog from "@/components/agenda/NovoEventoDialog";
import EventoDetailDialog from "@/components/agenda/EventoDetailDialog";
import type { EventoRow } from "@/hooks/use-eventos";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusColor: Record<string, string> = {
  Confirmado: "bg-green-500",
  Pendente: "bg-yellow-500",
  Cancelado: "bg-red-500",
};

const prioridadeBorder: Record<string, string> = {
  Alta: "border-l-red-500",
  Média: "border-l-yellow-500",
  Baixa: "border-l-blue-500",
};

type ViewMode = "month" | "week" | "day";

export default function Agenda() {
  const { eventos, isLoading, insert, update, remove } = useEventos();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editEvento, setEditEvento] = useState<EventoRow | null>(null);
  const [detailEvento, setDetailEvento] = useState<EventoRow | null>(null);

  // Parse event dates
  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventoRow[]>();
    eventos.forEach(ev => {
      const key = ev.data; // already YYYY-MM-DD
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });
    return map;
  }, [eventos]);

  // Days with events for calendar indicators
  const daysWithEvents = useMemo(() => {
    return new Set(eventos.map(ev => ev.data));
  }, [eventos]);

  // Get visible days based on view mode
  const visibleDays = useMemo(() => {
    if (viewMode === "day") {
      return selectedDate ? [selectedDate] : [currentDate];
    }
    if (viewMode === "week") {
      const target = selectedDate || currentDate;
      const ws = startOfWeek(target, { weekStartsOn: 0 });
      const we = endOfWeek(target, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: ws, end: we });
    }
    // month
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(currentDate);
    const ws = startOfWeek(ms, { weekStartsOn: 0 });
    const we = endOfWeek(me, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: ws, end: we });
  }, [currentDate, selectedDate, viewMode]);

  // Events for the selected/visible date
  const selectedDayEvents = useMemo(() => {
    const target = selectedDate || currentDate;
    const key = format(target, "yyyy-MM-dd");
    return eventsByDate.get(key) || [];
  }, [selectedDate, currentDate, eventsByDate]);

  const navigatePrev = () => {
    if (viewMode === "month") setCurrentDate(prev => subMonths(prev, 1));
    else if (viewMode === "week") setCurrentDate(prev => new Date(prev.getTime() - 7 * 86400000));
    else setCurrentDate(prev => new Date(prev.getTime() - 86400000));
  };

  const navigateNext = () => {
    if (viewMode === "month") setCurrentDate(prev => addMonths(prev, 1));
    else if (viewMode === "week") setCurrentDate(prev => new Date(prev.getTime() + 7 * 86400000));
    else setCurrentDate(prev => new Date(prev.getTime() + 86400000));
  };

  const handleSave = async (data: any) => {
    const isEdit = !!data.id;
    if (isEdit) {
      await update(data);
      toast({ title: "Evento atualizado!" });
    } else {
      const newEvento = await insert(data);
      toast({ title: "Evento criado!" });
      // Send Telegram notification
      try {
        await supabase.functions.invoke("telegram-event-notify", {
          body: { evento_id: newEvento.id, action: "criacao" },
        });
      } catch (e) {
        console.error("Notification error:", e);
      }
    }
  };

  const handleDelete = async (id: string) => {
    // Send cancellation notification before deleting
    const ev = eventos.find(e => e.id === id);
    if (ev) {
      try {
        await supabase.functions.invoke("telegram-event-notify", {
          body: { evento_id: id, action: "cancelamento" },
        });
      } catch (e) {
        console.error("Cancel notification error:", e);
      }
    }
    await remove(id);
    toast({ title: "Evento excluído" });
  };

  const handleEdit = (ev: EventoRow) => {
    setEditEvento(ev);
    setShowNewDialog(true);
  };

  const formatDateBR = (d: string) => {
    try {
      const [y, m, day] = d.split("-");
      return `${day}/${m}/${y}`;
    } catch { return d; }
  };

  const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda Parlamentar</h1>
          <p className="text-sm text-muted-foreground">Eventos vinculados a cidades, lideranças e demandas</p>
        </div>
        <Button onClick={() => { setEditEvento(null); setShowNewDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Evento
        </Button>
      </div>

      {/* Navigation & View Toggles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center capitalize">
            {viewMode === "day"
              ? format(selectedDate || currentDate, "dd 'de' MMMM yyyy", { locale: ptBR })
              : format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}>
            Hoje
          </Button>
        </div>
        <div className="flex gap-1">
          {(["month", "week", "day"] as ViewMode[]).map(mode => (
            <Button
              key={mode}
              variant={viewMode === mode ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode(mode)}
            >
              {mode === "month" ? "Mês" : mode === "week" ? "Semana" : "Dia"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          {viewMode === "month" && (
            <Card>
              <CardContent className="p-3">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-0 mb-1">
                  {WEEKDAYS.map(d => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7 gap-0">
                  {visibleDays.map(day => {
                    const key = format(day, "yyyy-MM-dd");
                    const dayEvents = eventsByDate.get(key) || [];
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);

                    return (
                      <div
                        key={key}
                        className={`min-h-[80px] border border-border/50 p-1 cursor-pointer transition-colors hover:bg-accent/50 ${
                          !isCurrentMonth ? "opacity-40" : ""
                        } ${isSelected ? "bg-primary/10 ring-1 ring-primary" : ""} ${
                          isTodayDate ? "bg-accent/30" : ""
                        }`}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div className={`text-xs font-medium mb-1 ${
                          isTodayDate ? "text-primary font-bold" : "text-foreground"
                        }`}>
                          {format(day, "d")}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map(ev => (
                            <div
                              key={ev.id}
                              className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer ${
                                statusColor[ev.status] || "bg-primary"
                              } text-white`}
                              onClick={e => { e.stopPropagation(); setDetailEvento(ev); }}
                              title={ev.titulo}
                            >
                              {!ev.dia_inteiro && <span className="font-medium">{ev.hora} </span>}
                              {ev.titulo}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-muted-foreground px-1">
                              +{dayEvents.length - 3} mais
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {(viewMode === "week" || viewMode === "day") && (
            <Card>
              <CardContent className="p-3">
                <div className={`grid ${viewMode === "week" ? "grid-cols-7" : "grid-cols-1"} gap-2`}>
                  {visibleDays.map(day => {
                    const key = format(day, "yyyy-MM-dd");
                    const dayEvents = eventsByDate.get(key) || [];
                    const isTodayDate = isToday(day);

                    return (
                      <div key={key} className={`${viewMode === "day" ? "" : "min-h-[300px]"} border rounded-lg p-2 ${
                        isTodayDate ? "border-primary bg-primary/5" : "border-border"
                      }`}>
                        <div className={`text-sm font-medium mb-2 text-center ${isTodayDate ? "text-primary" : ""}`}>
                          {viewMode === "week" && <div className="text-xs text-muted-foreground">{WEEKDAYS[day.getDay()]}</div>}
                          <div>{format(day, "dd/MM")}</div>
                        </div>
                        <div className="space-y-1">
                          {dayEvents.map(ev => (
                            <div
                              key={ev.id}
                              className={`text-xs p-2 rounded border-l-2 ${prioridadeBorder[ev.prioridade] || "border-l-primary"} bg-card hover:bg-accent cursor-pointer`}
                              onClick={() => setDetailEvento(ev)}
                            >
                              <div className="font-medium truncate">{ev.titulo}</div>
                              <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" />
                                {ev.dia_inteiro ? "Dia inteiro" : ev.hora}
                              </div>
                              <div className="text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {ev.cidade}
                              </div>
                            </div>
                          ))}
                          {dayEvents.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">Sem eventos</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Events for selected day */}
        <div className="space-y-3">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">
                {selectedDate
                  ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                  : "Selecione um dia"}
              </h3>
              {selectedDayEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Nenhum evento neste dia</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map(ev => (
                    <div
                      key={ev.id}
                      className={`p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors border-l-4 ${prioridadeBorder[ev.prioridade] || ""}`}
                      onClick={() => setDetailEvento(ev)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm">{ev.titulo}</h4>
                        <Badge variant="outline" className="text-[10px] shrink-0">{ev.status}</Badge>
                      </div>
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {ev.dia_inteiro ? "Dia inteiro" : `${ev.hora}${ev.hora_fim ? ` - ${ev.hora_fim}` : ""}`}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {ev.cidade}
                          {ev.local_nome && ` — ${ev.local_nome}`}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" /> {ev.tipo}
                        </div>
                        {ev.participantes_liderancas && ev.participantes_liderancas.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" /> {ev.participantes_liderancas.length} lideranças
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => {
                  setEditEvento(null);
                  setShowNewDialog(true);
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Adicionar evento
              </Button>
            </CardContent>
          </Card>

          {/* Quick summary */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2">Resumo do mês</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de eventos</span>
                  <span className="font-medium">
                    {eventos.filter(e => e.data.startsWith(format(currentDate, "yyyy-MM"))).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmados</span>
                  <span className="font-medium text-green-600">
                    {eventos.filter(e => e.data.startsWith(format(currentDate, "yyyy-MM")) && e.status === "Confirmado").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pendentes</span>
                  <span className="font-medium text-yellow-600">
                    {eventos.filter(e => e.data.startsWith(format(currentDate, "yyyy-MM")) && e.status === "Pendente").length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <NovoEventoDialog
        open={showNewDialog}
        onOpenChange={v => { setShowNewDialog(v); if (!v) setEditEvento(null); }}
        onSave={handleSave}
        initialDate={selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined}
        evento={editEvento}
      />
      <EventoDetailDialog
        evento={detailEvento}
        open={!!detailEvento}
        onOpenChange={v => { if (!v) setDetailEvento(null); }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
