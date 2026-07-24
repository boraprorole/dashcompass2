import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Send, Sparkles, StopCircle, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type ChatSettings = {
  provider: "anthropic" | "openai";
  model: string;
  reportId: string | null;
};

type Props = {
  threadId: string;
  initialMessages: UIMessage[];
  settings: ChatSettings;
};

export function AiChatWindow({ threadId, initialMessages, settings }: Props) {
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        prepareSendMessagesRequest: async ({ messages, id }) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return {
            headers: {
              "content-type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: {
              threadId: id,
              messages,
              provider: settingsRef.current.provider,
              model: settingsRef.current.model,
              reportId: settingsRef.current.reportId,
            },
          };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    transport,
    messages: initialMessages,
  });

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const busy = status === "streaming" || status === "submitted";

  const submit = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    sendMessage({ text });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/60 p-6 text-center text-sm text-muted-foreground">
              <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" />
              Comece a conversar com o <span className="font-semibold text-foreground">Compass AI</span>.

            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error.message}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-border/60 bg-background/80 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Pergunte algo ao Compass AI…  (Enter para enviar · Shift+Enter para quebrar linha)"
            className="min-h-[60px] max-h-48 resize-none"
          />
          {busy ? (
            <Button variant="secondary" size="icon" onClick={() => stop()} title="Parar">
              <StopCircle className="h-5 w-5" />
            </Button>
          ) : (
            <Button size="icon" onClick={submit} disabled={!input.trim()} title="Enviar">
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border/60 bg-card text-foreground",
        )}
      >
        {message.parts.map((part, idx) => {
          if (part.type === "text") {
            return (
              <div
                key={idx}
                className={cn(
                  "prose prose-sm max-w-none dark:prose-invert",
                  "prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-semibold",
                  "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
                  "prose-p:my-2 prose-p:leading-relaxed",
                  "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
                  "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none",
                  "prose-pre:my-2 prose-pre:rounded-lg prose-pre:bg-muted prose-pre:p-3 prose-pre:text-xs",
                  "prose-table:my-3 prose-table:w-full prose-table:text-xs",
                  "prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-2 prose-th:py-1 prose-th:text-left",
                  "prose-td:border prose-td:border-border prose-td:px-2 prose-td:py-1 prose-td:align-top",
                  "prose-a:text-primary hover:prose-a:underline",
                  isUser && "prose-invert",
                )}
              >
                <div className="overflow-x-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
                </div>
              </div>
            );
          }
          if (part.type === "reasoning") {
            const p = part as { text?: string };
            if (!p.text) return null;
            return (
              <details key={idx} className="mt-2 rounded border border-border/40 bg-muted/40 p-2 text-xs">
                <summary className="cursor-pointer text-muted-foreground">Raciocínio</summary>
                <div className="mt-1 whitespace-pre-wrap text-muted-foreground">{p.text}</div>
              </details>
            );
          }
          if (typeof part.type === "string" && part.type.startsWith("tool-")) {
            const toolName = part.type.slice("tool-".length);
            const p = part as {
              state?: string;
              input?: unknown;
              output?: unknown;
              errorText?: string;
            };
            const running = p.state === "input-streaming" || p.state === "input-available";
            return (
              <div
                key={idx}
                className="mt-2 rounded-lg border border-border/50 bg-muted/40 p-2 text-xs"
              >
                <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                  {running ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wrench className="h-3 w-3" />
                  )}
                  <span className="font-medium">{toolName}</span>
                  <Badge variant="outline" className="ml-1 px-1.5 py-0 text-[10px]">
                    {p.state ?? "?"}
                  </Badge>
                </div>
                {p.input != null && (
                  <pre className="max-h-40 overflow-auto rounded bg-background/60 p-1.5 text-[11px] leading-tight">
                    {JSON.stringify(p.input, null, 2)}
                  </pre>
                )}
                {p.output != null && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-muted-foreground">Resultado</summary>
                    <pre className="mt-1 max-h-64 overflow-auto rounded bg-background/60 p-1.5 text-[11px] leading-tight">
                      {JSON.stringify(p.output, null, 2)}
                    </pre>
                  </details>
                )}
                {p.errorText && (
                  <div className="mt-1 text-destructive">{p.errorText}</div>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
