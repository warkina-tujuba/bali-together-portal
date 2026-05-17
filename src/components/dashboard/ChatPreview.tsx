import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { MessageCircle, ChevronRight } from "lucide-react";

export function ChatPreview({ memberCount, lastMessage, lastFrom }: {
  memberCount: number;
  lastMessage?: string | null;
  lastFrom?: string | null;
}) {
  return (
    <Link to="/chat" className="block">
      <Card className="rounded-3xl border-0 p-5 shadow-soft transition hover:shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight">Group chat</p>
            {lastMessage ? (
              <p className="truncate text-xs text-muted-foreground">
                <span className="font-medium">{lastFrom ?? "Someone"}:</span> {lastMessage}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{memberCount} in the crew · say hi 👋</p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </Card>
    </Link>
  );
}
