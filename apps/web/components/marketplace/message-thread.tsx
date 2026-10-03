interface Msg {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function MessageThread({ messages, meId }: { messages: Msg[]; meId: string }) {
  return (
    <div className="flex-1 space-y-2 overflow-y-auto py-2">
      {messages.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-muted">Say hello to get started.</p>
      )}
      {messages.map((m) => {
        const mine = m.sender_id === meId;
        return (
          <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                mine ? 'bg-primary text-white' : 'border border-hairline bg-white text-ink'
              }`}
            >
              {m.body}
            </div>
          </div>
        );
      })}
    </div>
  );
}
