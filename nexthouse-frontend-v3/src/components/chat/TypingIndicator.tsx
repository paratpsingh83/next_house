'use client';

export default function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <div className="flex items-center gap-2 pl-9">
      <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-gray-100 flex items-center gap-1">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
      <span className="text-xs text-gray-400">{names[0]} is typing…</span>
    </div>
  );
}