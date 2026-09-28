import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, Column } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  onRename: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
};

export const KanbanColumn = ({
  column,
  cards,
  onRename,
  onAddCard,
  onDeleteCard,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "flex min-h-0 min-w-[272px] flex-1 basis-0 snap-start flex-col rounded-2xl border border-[var(--stroke)] bg-[var(--column)] transition",
        isOver && "ring-2 ring-[var(--accent-yellow)]"
      )}
      data-testid={`column-${column.id}`}
    >
      <header className="flex items-center gap-2 border-t-[3px] border-[var(--accent-yellow)] rounded-t-2xl px-3 pb-2 pt-3">
        <input
          key={`${column.id}-${column.title}`}
          defaultValue={column.title}
          onBlur={(event) => {
            const title = event.currentTarget.value;
            if (title !== column.title) {
              onRename(column.id, title);
            }
          }}
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 font-display text-[15px] font-semibold text-[var(--navy-dark)] outline-none transition hover:bg-white/70 focus:bg-white focus:ring-2 focus:ring-[var(--primary-blue)]/40"
          aria-label="Column title"
        />
        <span
          className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[var(--gray-text)]"
          aria-label={`${cards.length} cards`}
        >
          {cards.length}
        </span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-1 pt-1">
        <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onDelete={(cardId) => onDeleteCard(column.id, cardId)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="flex min-h-24 flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--navy-dark)]/15 px-3 py-6 text-center text-xs font-medium text-[var(--gray-text)]">
            Drop a card here
          </div>
        )}
      </div>
      <NewCardForm
        onAdd={(title, details) => onAddCard(column.id, title, details)}
      />
    </section>
  );
};
