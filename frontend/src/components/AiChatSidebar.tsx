"use client";

import { useMemo, useState, type FormEvent } from "react";
import { boardToDto } from "@/lib/boardApi";
import { createAiApi, type ConversationMessage } from "@/lib/aiApi";
import type { BoardData } from "@/lib/kanban";

type AiChatSidebarProps = {
  authorization: string;
  board: BoardData;
  onBoardUpdated: () => Promise<void>;
};

export const AiChatSidebar = ({
  authorization,
  board,
  onBoardUpdated,
}: AiChatSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const api = useMemo(() => createAiApi(authorization), [authorization]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = (pendingQuestion ?? question).trim();
    if (!value || pendingQuestion) return;

    setError(null);
    setQuestion("");
    setPendingQuestion(value);
    const nextMessages = [...messages, { role: "user" as const, content: value }];
    setMessages(nextMessages);

    try {
      const result = await api.boardOperation({
        board: boardToDto(board),
        question: value,
        history: messages,
      });
      setMessages([
        ...nextMessages,
        { role: "assistant", content: result.assistant_response },
      ]);
      if (result.board_update) await onBoardUpdated();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to complete the AI request.");
      setMessages(messages);
      setQuestion(value);
    } finally {
      setPendingQuestion(null);
    }
  };

  return (
    <>
      <button
        type="button"
        className="fixed bottom-5 right-5 z-30 rounded-full bg-[var(--secondary-purple)] px-5 py-3 text-sm font-semibold text-white shadow-lg lg:bottom-8 lg:right-8"
        aria-expanded={isOpen}
        aria-controls="ai-chat-sidebar"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? "Close AI chat" : "Open AI chat"}
      </button>
      {isOpen ? (
        <aside
          id="ai-chat-sidebar"
          aria-label="AI chat"
          className="fixed inset-x-0 bottom-0 z-20 flex h-[min(78vh,620px)] flex-col border-t border-[var(--stroke)] bg-white shadow-2xl lg:inset-y-0 lg:left-auto lg:right-0 lg:h-screen lg:w-[390px] lg:border-l lg:border-t-0"
        >
          <header className="flex items-center justify-between border-b border-[var(--stroke)] p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                Assistant
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--navy-dark)]">Board copilot</h2>
            </div>
            <button
              type="button"
              aria-label="Close AI chat"
              className="rounded-lg px-2 py-1 text-xl text-[var(--gray-text)] hover:bg-[var(--surface)]"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </header>
          <div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
            {messages.length === 0 ? (
              <p className="rounded-xl bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--gray-text)]">
                Ask me to create, edit, or move cards on your board.
              </p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-xl p-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "ml-6 bg-[var(--primary-blue)] text-white"
                      : "mr-6 bg-[var(--surface)] text-[var(--navy-dark)]"
                  }`}
                >
                  {message.content}
                </div>
              ))
            )}
            {pendingQuestion ? (
              <p role="status" className="text-sm text-[var(--gray-text)]">
                Thinking...
              </p>
            ) : null}
            {error ? (
              <div role="alert" className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <p>{error}</p>
                <button type="submit" form="ai-chat-form" className="font-semibold underline">
                  Retry
                </button>
              </div>
            ) : null}
          </div>
          <form id="ai-chat-form" className="border-t border-[var(--stroke)] p-5" onSubmit={submit}>
            <label htmlFor="ai-chat-input" className="sr-only">Message the board copilot</label>
            <div className="flex gap-2">
              <textarea
                id="ai-chat-input"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What should change?"
                rows={2}
                disabled={Boolean(pendingQuestion)}
                className="min-w-0 flex-1 resize-none rounded-xl border border-[var(--stroke)] p-3 text-sm outline-none focus:border-[var(--primary-blue)]"
              />
              <button
                type="submit"
                disabled={!question.trim() || Boolean(pendingQuestion)}
                className="self-end rounded-xl bg-[var(--secondary-purple)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </aside>
      ) : null}
    </>
  );
};
