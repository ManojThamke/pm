import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";
import { TrashIcon } from "@/components/Icons";

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: string) => void;
};

export const KanbanCard = ({ card, onDelete }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group relative cursor-grab rounded-xl border border-[var(--stroke)] bg-white px-3.5 py-3 shadow-[0_4px_12px_rgba(3,33,71,0.06)]",
        "transition-shadow duration-150 hover:shadow-[0_8px_20px_rgba(3,33,71,0.1)] active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
      {...attributes}
      {...listeners}
      data-testid={`card-${card.id}`}
    >
      <h4 className="pr-7 font-display text-sm font-semibold leading-5 text-[var(--navy-dark)]">
        {card.title}
      </h4>
      <p className="mt-1 text-[13px] leading-5 text-[var(--gray-text)]">{card.details}</p>
      <button
        type="button"
        onClick={() => onDelete(card.id)}
        className="absolute right-2 top-2 rounded-md p-1.5 text-[var(--gray-text)] transition hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
        aria-label={`Delete ${card.title}`}
        title="Delete card"
      >
        <TrashIcon width={14} height={14} />
      </button>
    </article>
  );
};
