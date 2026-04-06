import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export function useChatAssistente(tenantId: string | null, userId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load history on mount
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setMessages(data.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            created_at: m.created_at,
          })));
        }
      });
  }, [userId]);

  const sendMessage = useCallback(async (input: string) => {
    if (!tenantId || !userId || !input.trim()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Persist user message
    supabase.from("chat_messages").insert({
      id: userMsg.id,
      tenant_id: tenantId,
      user_id: userId,
      role: "user",
      content: userMsg.content,
    }).then(() => {});

    // Build conversation for AI (last 10 messages for context)
    const recentMessages = [...messages.slice(-10), userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let assistantContent = "";
    const assistantId = crypto.randomUUID();

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id === assistantId) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [
          ...prev,
          { id: assistantId, role: "assistant", content: assistantContent, created_at: new Date().toISOString() },
        ];
      });
    };

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistente`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: recentMessages, tenant_id: tenantId }),
          signal: controller.signal,
        }
      );

      if (!resp.ok || !resp.body) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.error || `Erro ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }

      // Persist assistant message
      if (assistantContent) {
        supabase.from("chat_messages").insert({
          id: assistantId,
          tenant_id: tenantId,
          user_id: userId,
          role: "assistant",
          content: assistantContent,
        }).then(() => {});
      }
    } catch (e: any) {
      if (e.name === "AbortError") return;
      upsertAssistant("\n\n⚠️ Erro ao processar: " + (e.message || "tente novamente."));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [tenantId, userId, messages]);

  const clearChat = useCallback(async () => {
    if (!userId) return;
    await supabase.from("chat_messages").delete().eq("user_id", userId);
    setMessages([]);
  }, [userId]);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  return { messages, isLoading, sendMessage, clearChat, cancelStream };
}
