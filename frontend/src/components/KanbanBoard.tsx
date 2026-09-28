"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { createId, initialData, moveCard, type BoardData } from "@/lib/kanban";
import { boardFromDto, boardToDto, createBoardApi } from "@/lib/boardApi";
import { AiChatSidebar } from "@/components/AiChatSidebar";
import { LogOutIcon, SparkIcon } from "@/components/Icons";

type KanbanBoardProps = {
  username?: string;
  authorization?: string;
  onLogout?: () => void;
};

export const KanbanBoard = ({ username, authorization, onLogout }: KanbanBoardProps = {}) => {
  const [board, setBoard] = useState<BoardData>(() => initialData);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(authorization));
  const [isSaving, setIsSaving] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useMemo(
    () => (authorization ? createBoardApi(authorization) : null),
    [authorization]
  );

  useEffect(() => {
    if (!api) return;
    api.getBoard()
      .then((dto) => setBoard(boardFromDto(dto)))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load the board."))
      .finally(() => setIsLoading(false));
  }, [api]);

  const persist = (nextBoard: BoardData) => {
    setBoard(nextBoard);
    if (!api) return;
    setIsSaving(true);
    setError(null);
    api.updateBoard(boardToDto(nextBoard))
      .then((dto) => setBoard(boardFromDto(dto)))
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Unable to save the board.");
        api.getBoard().then((dto) => setBoard(boardFromDto(dto))).catch(() => undefined);
      })
      .finally(() => setIsSaving(false));
  };

  const refreshBoard = async () => {
    if (!api) return;
    const dto = await api.getBoard();
    setBoard(boardFromDto(dto));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const cardsById = useMemo(() => board.cards, [board.cards]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const next = {
      ...board,
      columns: moveCard(board.columns, active.id as string, over.id as string),
    };
    persist(next);
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    persist({
      ...board,
      columns: board.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      ),
    });
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    persist({
      ...board,
      cards: {
        ...board.cards,
        [id]: { id, title, details: details || "No details yet." },
      },
      columns: board.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    });
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    persist({
        ...board,
        cards: Object.fromEntries(
          Object.entries(board.cards).filter(([id]) => id !== cardId)
        ),
        columns: board.columns.map((column) =>
          column.id === columnId
            ? {
                ...column,
                cardIds: column.cardIds.filter((id) => id !== cardId),
              }
            : column
        ),
    });
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--surface)]">
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--stroke)] bg-white px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-7 w-1.5 shrink-0 rounded-full bg-[var(--accent-yellow)]" />
            <h1 className="font-display text-xl font-semibold text-[var(--navy-dark)]">
              Kanban Studio
            </h1>
            {isLoading ? (
              <p role="status" className="text-xs font-medium text-[var(--gray-text)]">
                Loading board...
              </p>
            ) : null}
            {isSaving ? (
              <p role="status" className="text-xs font-medium text-[var(--gray-text)]">
                Saving changes...
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {authorization && !isChatOpen ? (
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg bg-[var(--secondary-purple)] p-2 sm:px-3 sm:py-1.5 text-sm font-semibold text-white transition hover:brightness-110"
                aria-expanded={isChatOpen}
                aria-controls="ai-chat-sidebar"
                onClick={() => setIsChatOpen(true)}
              >
                <SparkIcon />
                <span className="sr-only sm:not-sr-only">Open AI chat</span>
              </button>
            ) : null}
            {onLogout ? (
              <>
                <span className="hidden text-sm text-[var(--gray-text)] sm:inline">
                  Signed in as <span className="font-semibold text-[var(--navy-dark)]">{username}</span>
                </span>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-[var(--stroke)] p-2 sm:px-3 sm:py-1.5 text-sm font-semibold text-[var(--navy-dark)] transition hover:bg-[var(--surface)]"
                  onClick={onLogout}
                >
                  <LogOutIcon />
                  <span className="sr-only sm:not-sr-only">Log out</span>
                </button>
              </>
            ) : null}
          </div>
        </header>
        {error ? (
          <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 lg:px-6">
            {error}
          </p>
        ) : null}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <section
            aria-label="Board columns"
            className="flex min-h-0 flex-1 snap-x scroll-px-4 gap-4 overflow-x-auto p-4 lg:scroll-px-6 lg:p-6"
          >
            {board.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={column.cardIds.map((cardId) => board.cards[cardId])}
                onRename={handleRenameColumn}
                onAddCard={handleAddCard}
                onDeleteCard={handleDeleteCard}
              />
            ))}
          </section>
          <DragOverlay>
            {activeCard ? (
              <div className="w-[272px] rotate-2">
                <KanbanCardPreview card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
      {authorization ? (
        <AiChatSidebar
          authorization={authorization}
          board={board}
          onBoardUpdated={refreshBoard}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      ) : null}
    </div>
  );
};
