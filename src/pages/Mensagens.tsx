import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, User, Search, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TelegramContact {
  id: string;
  chat_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  lideranca_name: string | null;
  created_at: string;
}

interface TelegramMessage {
  id: string;
  chat_id: number;
  direction: string;
  text: string | null;
  is_read: boolean;
  created_at: string;
}

interface Lideranca {
  name: string;
  telegram_username: string | null;
  avatar_url: string | null;
}

interface MergedContact {
  type: "telegram" | "lideranca_pending";
  telegramContact?: TelegramContact;
  liderancaName: string;
  liderancaUsername?: string;
  liderancaAvatarUrl?: string | null;
  chatId?: number;
}

function normalizeUsername(raw?: string | null): string {
  if (!raw) return "";
  return raw.replace(/^@/, "").toLowerCase().trim();
}

export default function Mensagens() {
  const [contacts, setContacts] = useState<TelegramContact[]>([]);
  const [liderancas, setLiderancas] = useState<Lideranca[]>([]);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [selectedContactKey, setSelectedContactKey] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load contacts and liderancas
  useEffect(() => {
    const fetchContacts = async () => {
      const { data } = await supabase
        .from("telegram_contacts")
        .select("*")
        .order("updated_at", { ascending: false });
      if (data) setContacts(data as TelegramContact[]);
    };
    const fetchLiderancas = async () => {
      const { data } = await supabase
        .from("liderancas")
        .select("name, telegram_username, avatar_url")
        .not("telegram_username", "is", null);
      if (data) setLiderancas(data as Lideranca[]);
    };
    fetchContacts();
    fetchLiderancas();

    // Realtime for telegram_contacts
    const contactsChannel = supabase
      .channel("contacts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "telegram_contacts" },
        () => {
          fetchContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contactsChannel);
    };
  }, []);

  // Merge contacts
  const mergedContacts = useMemo<MergedContact[]>(() => {
    const result: MergedContact[] = [];
    const linkedUsernames = new Set<string>();

    contacts.forEach((c) => {
      const norm = normalizeUsername(c.username);
      if (norm) linkedUsernames.add(norm);

      // Try to find matching lideranca for avatar
      const matchedLideranca = liderancas.find(
        (l) => normalizeUsername(l.telegram_username) === norm && norm !== ""
      );

      result.push({
        type: "telegram",
        telegramContact: c,
        liderancaName:
          c.lideranca_name ||
          matchedLideranca?.name ||
          [c.first_name, c.last_name].filter(Boolean).join(" ") ||
          c.username ||
          `Chat ${c.chat_id}`,
        liderancaUsername: c.username || undefined,
        liderancaAvatarUrl: matchedLideranca?.avatar_url,
        chatId: c.chat_id,
      });
    });

    liderancas.forEach((l) => {
      const norm = normalizeUsername(l.telegram_username);
      if (norm && !linkedUsernames.has(norm)) {
        result.push({
          type: "lideranca_pending",
          liderancaName: l.name,
          liderancaUsername: l.telegram_username?.replace("@", ""),
          liderancaAvatarUrl: l.avatar_url,
        });
      }
    });

    return result;
  }, [contacts, liderancas]);

  // Derive selected contact from key
  const selectedContact = useMemo(() => {
    if (!selectedContactKey) return null;
    return mergedContacts.find((c) => getContactKey(c) === selectedContactKey) ?? null;
  }, [selectedContactKey, mergedContacts]);

  const filteredContacts = useMemo(() => {
    if (!searchTerm) return mergedContacts;
    const term = searchTerm.toLowerCase();
    return mergedContacts.filter(
      (c) =>
        c.liderancaName.toLowerCase().includes(term) ||
        c.liderancaUsername?.toLowerCase().includes(term)
    );
  }, [mergedContacts, searchTerm]);

  // Load messages for selected contact
  useEffect(() => {
    if (!selectedContact?.chatId) {
      setMessages([]);
      return;
    }

    const chatId = selectedContact.chatId;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("telegram_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as TelegramMessage[]);
    };
    fetchMessages();

    // Mark as read
    supabase
      .from("telegram_messages")
      .update({ is_read: true })
      .eq("chat_id", chatId)
      .eq("is_read", false)
      .then();

    // Subscribe to realtime messages
    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "telegram_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as TelegramMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedContact?.chatId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedContact?.chatId || sending) return;
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("telegram-send", {
        body: { chat_id: selectedContact.chatId, text: newMessage },
      });

      if (error) throw error;
      setNewMessage("");
    } catch (err: any) {
      toast({
        title: "Erro ao enviar",
        description: err.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="flex h-[calc(100vh-5rem)] max-w-7xl mx-auto gap-4">
      {/* Contact list */}
      <Card className="w-80 shrink-0 flex flex-col">
        <div className="p-3 border-b">
          <h2 className="text-lg font-bold text-foreground mb-2">Mensagens</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contato..."
              className="pl-8 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {filteredContacts.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Nenhum contato ainda.</p>
              <p className="text-xs mt-1">Cadastre lideranças com Telegram ou aguarde mensagens ao bot.</p>
            </div>
          ) : (
            filteredContacts.map((c) => {
              const key = getContactKey(c);
              return (
                <button
                  key={key}
                  onClick={() => setSelectedContactKey(key)}
                  className={`w-full flex items-center gap-3 p-3 text-left hover:bg-accent/50 transition-colors border-b border-border/50 ${
                    selectedContactKey === key ? "bg-accent" : ""
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{getInitials(c.liderancaName)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate">{c.liderancaName}</p>
                      {c.type === "lideranca_pending" && (
                        <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
                      )}
                    </div>
                    {c.liderancaUsername && (
                      <p className="text-[10px] text-muted-foreground">@{c.liderancaUsername}</p>
                    )}
                    {c.type === "lideranca_pending" && (
                      <p className="text-[10px] text-warning">Aguardando iniciar conversa</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </ScrollArea>
      </Card>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{getInitials(selectedContact.liderancaName)}</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{selectedContact.liderancaName}</h3>
                {selectedContact.liderancaUsername && (
                  <p className="text-xs text-muted-foreground">@{selectedContact.liderancaUsername} · Telegram</p>
                )}
              </div>
              {selectedContact.type === "telegram" && selectedContact.telegramContact?.lideranca_name && (
                <Badge variant="outline" className="ml-auto text-[10px]">
                  <User className="h-3 w-3 mr-1" /> Liderança
                </Badge>
              )}
              {selectedContact.type === "lideranca_pending" && (
                <Badge variant="outline" className="ml-auto text-[10px] border-warning/30 text-warning">
                  <AlertCircle className="h-3 w-3 mr-1" /> Pendente
                </Badge>
              )}
            </div>

            {selectedContact.type === "lideranca_pending" ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center max-w-sm px-4">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-warning opacity-60" />
                  <p className="text-sm font-medium text-foreground">Conversa ainda não iniciada</p>
                  <p className="text-xs mt-2">
                    Para enviar mensagens, <strong>{selectedContact.liderancaName}</strong> precisa enviar uma mensagem ao bot do Telegram primeiro.
                  </p>
                  <p className="text-xs mt-2">
                    Peça para enviar <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">/start</code> ao bot no Telegram.
                  </p>
                  {selectedContact.liderancaUsername && (
                    <p className="text-xs mt-3 text-muted-foreground">
                      Username: <span className="font-medium">@{selectedContact.liderancaUsername}</span>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.direction === "outgoing" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                            m.direction === "outgoing"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          }`}
                        >
                          <p>{m.text}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              m.direction === "outgoing" ? "text-primary-foreground/60" : "text-muted-foreground"
                            }`}
                          >
                            {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>

                <div className="p-3 border-t flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    disabled={sending}
                  />
                  <Button onClick={handleSend} disabled={!newMessage.trim() || sending} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Selecione uma conversa</p>
              <p className="text-xs mt-1">Escolha um contato à esquerda para ver as mensagens</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function getContactKey(c: MergedContact): string {
  if (c.type === "telegram" && c.telegramContact) {
    return `tg-${c.telegramContact.chat_id}`;
  }
  return `pending-${normalizeUsername(c.liderancaUsername)}`;
}
