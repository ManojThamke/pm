import { useState, type FormEvent } from "react";
import { PlusIcon } from "@/components/Icons";

const initialFormState = { title: "", details: "" };

type NewCardFormProps = {
  onAdd: (title: string, details: string) => void;
};

export const NewCardForm = ({ onAdd }: NewCardFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState(initialFormState);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.title.trim()) {
      return;
    }
    onAdd(formState.title.trim(), formState.details.trim());
    setFormState(initialFormState);
    setIsOpen(false);
  };

  return (
    <div className="p-3 pt-2">
      {isOpen ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-2 rounded-xl border border-[var(--stroke)] bg-white p-2.5 shadow-[0_4px_12px_rgba(3,33,71,0.06)]"
        >
          <input
            value={formState.title}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Card title"
            className="w-full rounded-lg border border-[var(--stroke)] bg-white px-2.5 py-1.5 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
            autoFocus
            required
          />
          <textarea
            value={formState.details}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, details: event.target.value }))
            }
            placeholder="Details"
            rows={2}
            className="w-full resize-none rounded-lg border border-[var(--stroke)] bg-white px-2.5 py-1.5 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setFormState(initialFormState);
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--gray-text)] transition hover:bg-[var(--surface)] hover:text-[var(--navy-dark)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[var(--secondary-purple)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
            >
              Add card
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-[var(--primary-blue)] transition hover:bg-white"
        >
          <PlusIcon />
          Add a card
        </button>
      )}
    </div>
  );
};
