import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, User, Search } from "lucide-react";
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

export default function Mensagens() {
  const [contacts, setContacts] = useState<TelegramContact[]>([]);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [selectedContact, setSelectedContact] = useState<TelegramContact | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load contacts
  useEffect(() => {
    const fetchContacts = async () => {
      const { data } = await supabase
        .from("telegram_contacts")
        .select("*")
        .order("updated_at", { ascending: false });
      if (data) setContacts(data as TelegramContact[]);
    };
    fetchContacts();
  }, []);

  // Load messages for selected contact
  useEffect(() => {
    if (!selectedContact) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("telegram_messages")
        .select("*")
        .eq("chat_id", selectedContact.chat_id)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as TelegramMessage[]);
    };
    fetchMessages();

    // Mark as read
    supabase
      .from("telegram_messages")
      .update({ is_read: true })
      .eq("chat_id", selectedContact.chat_id)
      .eq("is_read", false)
      .then();

    // Subscribe to realtime
    const channel = supabase
      .channel(`messages-${selectedContact.chat_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "telegram_messages",
          filter: `chat_id=eq.${selectedContact.chat_id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as TelegramMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedContact]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedContact || sending) return;
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("telegram-send", {
        body: { chat_id: selectedContact.chat_id, text: newMessage },
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

  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts;
    const term = searchTerm.toLowerCase();
    return contacts.filter(
      (c) =>
        c.first_name?.toLowerCase().includes(term) ||
        c.last_name?.toLowerCase().includes(term) ||
        c.username?.toLowerCase().includes(term) ||
        c.lideranca_name?.toLowerCase().includes(term)
    );
  }, [contacts, searchTerm]);

  const getContactName = (c: TelegramContact) =>
    c.lideranca_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || c.username || `Chat ${c.chat_id}`;

  const getInitials = (c: TelegramContact) => {
    const name = getContactName(c);
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

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
              <p className="text-xs mt-1">Quando alguém enviar uma mensagem ao bot, aparecerá aqui.</p>
            </div>
          ) : (
            filteredContacts.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedContact(c)}
                className={`w-full flex items-center gap-3 p-3 text-left hover:bg-accent/50 transition-colors border-b border-border/50 ${
                  selectedContact?.id === c.id ? "bg-accent" : ""
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{getInitials(c)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{getContactName(c)}</p>
                  {c.username && (
                    <p className="text-[10px] text-muted-foreground">@{c.username}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </Card>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{getInitials(selectedContact)}</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{getContactName(selectedContact)}</h3>
                {selectedContact.username && (
                  <p className="text-xs text-muted-foreground">@{selectedContact.username} · Telegram</p>
                )}
              </div>
              {selectedContact.lideranca_name && (
                <Badge variant="outline" className="ml-auto text-[10px]">
                  <User className="h-3 w-3 mr-1" /> Liderança
                </Badge>
              )}
            </div>

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
