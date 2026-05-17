import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getDashboard, listMessages, sendMessage } from "@/lib/trip.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({ component: ChatPage });

type Message = { id: string; trip_id: string; user_id: string; body: string; created_at: string };
type Member = { id: string; full_name: string | null; avatar_url: string | null };

function ChatPage() {
  const dashFn = useServerFn(getDashboard);
  const listFn = useServerFn(listMessages);
  const sendFn = useServerFn(sendMessage);
  const qc = useQueryClient();
  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: () => dashFn() });
  const { data: msgs } = useQuery({ queryKey: ["messages"], queryFn: () => listFn() });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const tripId = dash?.trip?.id;
  const meId = dash?.profile?.id;
  const members: Record<string, Member> = {};
  for (const m of dash?.members ?? []) members[m.id] = m as Member;

  // realtime subscribe
  useEffect(() => {
    if (!tripId) return;
    const channel = supabase
      .channel(`messages-${tripId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `trip_id=eq.${tripId}` }, () => {
        qc.invalidateQueries({ queryKey: ["messages"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tripId, qc]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs?.messages.length]);

  async function handleSend() {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setDraft("");
    try {
      await sendFn({ data: { body } });
      qc.invalidateQueries({ queryKey: ["messages"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setDraft(body);
    } finally { setSending(false); }
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link to="/dashboard" className="rounded-lg p-1.5 hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg">{dash?.trip?.name ?? "Group chat"}</p>
          <p className="text-xs text-muted-foreground">{(dash?.members ?? []).length} members</p>
        </div>
        <div className="flex -space-x-2">
          {(dash?.members ?? []).slice(0, 4).map((m) => (
            <div key={m.id} className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-secondary text-[10px] font-medium">
              {m.avatar_url ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" /> : (m.full_name?.[0] ?? "?")}
            </div>
          ))}
        </div>
      </header>

      <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {(msgs?.messages ?? []).length === 0 && (
          <div className="mx-auto mt-10 max-w-xs text-center text-sm text-muted-foreground">
            Say hi to the crew — this chat is private to your trip.
          </div>
        )}
        {(msgs?.messages ?? []).map((m: Message) => {
          const mine = m.user_id === meId;
          const author = members[m.user_id];
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[10px] font-medium">
                {author?.avatar_url ? <img src={author.avatar_url} alt="" className="h-full w-full object-cover" /> : (author?.full_name?.[0] ?? "?")}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                {!mine && <p className="mb-0.5 text-[10px] font-medium opacity-70">{author?.full_name ?? "Guest"}</p>}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Message the crew…"
            className="h-12 rounded-xl"
          />
          <Button onClick={handleSend} disabled={!draft.trim() || sending} className="h-12 rounded-xl px-4">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
