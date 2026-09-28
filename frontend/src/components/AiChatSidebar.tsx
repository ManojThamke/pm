"use client";

import { useMemo, useState, type FormEvent } from "react";
import { boardToDto } from "@/lib/boardApi";
import { createAiApi, type ConversationMessage } from "@/lib/aiApi";
import type { BoardData } from "@/lib/kanban";
import { CloseIcon, SendIcon, SparkIcon } from "@/components/Icons";

type AiChatSidebarProps = {
  authorization: string;
  board: BoardData;
  onBoardUpdated: () => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
};

export const AiChatSidebar = ({
  authorization,
  board,
  onBoardUpdated,
  isOpen,
  onClose,
}: AiChatSidebarProps) => {
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
    <aside
      id="ai-chat-sidebar"
      aria-label="AI chat"
      hidden={!isOpen}
      className="fixed inset-x-0 bottom-0 z-20 flex h-[min(78vh,620px)] flex-col rounded-t-2xl border-t border-[var(--stroke)] bg-white shadow-2xl lg:static lg:h-auto lg:w-[380px] lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none"
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--stroke)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--secondary-purple)]/10 text-[var(--secondary-purple)]">
            <SparkIcon />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold leading-5 text-[var(--navy-dark)]">
              Board copilot
            </h2>
            <p className="text-xs text-[var(--gray-text)]">Create, edit, or move cards</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close AI chat"
          title="Close"
          className="rounded-lg p-2 text-[var(--gray-text)] transition hover:bg-[var(--surface)] hover:text-[var(--navy-dark)]"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <p className="rounded-xl bg-[var(--surface)] p-3 text-sm leading-6 text-[var(--gray-text)]">
            Ask me to create, edit, or move cards on your board.
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-6 ${
                message.role === "user"
                  ? "ml-auto rounded-br-md bg-[var(--primary-blue)] text-white"
                  : "rounded-bl-md bg-[var(--surface)] text-[var(--navy-dark)]"
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
      <form id="ai-chat-form" className="border-t border-[var(--stroke)] p-3" onSubmit={submit}>
        <label htmlFor="ai-chat-input" className="sr-only">Message the board copilot</label>
        <div className="flex items-end gap-2 rounded-xl border border-[var(--stroke)] p-1.5 focus-within:border-[var(--primary-blue)]">
          <textarea
            id="ai-chat-input"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What should change?"
            rows={2}
            disabled={Boolean(pendingQuestion)}
            className="min-w-0 flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none"
          />
          <button
            type="submit"
            aria-label="Send"
            title="Send"
            disabled={!question.trim() || Boolean(pendingQuestion)}
            className="rounded-lg bg-[var(--secondary-purple)] p-2.5 text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </aside>
  );
};
