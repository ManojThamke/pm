import type { BoardData } from "@/lib/kanban";

export type BoardDto = {
  columns: Array<{ id: string; title: string; cardIds: string[] }>;
  cards: Record<string, { id: string; title: string; details: string }>;
};

export type BoardApi = {
  getBoard: () => Promise<BoardDto>;
  updateBoard: (board: BoardDto) => Promise<BoardDto>;
};

const toDto = (board: BoardData): BoardDto => ({
  columns: board.columns.map(({ id, title, cardIds }) => ({ id, title, cardIds: [...cardIds] })),
  cards: Object.fromEntries(
    Object.entries(board.cards).map(([id, card]) => [id, { ...card }])
  ),
});

const toBoard = (dto: BoardDto): BoardData => ({
  columns: dto.columns.map(({ id, title, cardIds }) => ({ id, title, cardIds: [...cardIds] })),
  cards: Object.fromEntries(
    Object.entries(dto.cards).map(([id, card]) => [id, { ...card }])
  ),
});

export const createBoardApi = (authorization: string, fetcher = fetch): BoardApi => {
  const request = async (method: "GET" | "PUT", board?: BoardDto) => {
    const response = await fetcher("/api/board", {
      method,
      headers: {
        Authorization: authorization,
        ...(board ? { "Content-Type": "application/json" } : {}),
      },
      ...(board ? { body: JSON.stringify(board) } : {}),
    });
    if (!response.ok) {
      throw new Error(response.status === 401 ? "Your session is no longer authorized." : "Unable to save the board.");
    }
    return (await response.json()) as BoardDto;
  };
  return {
    getBoard: () => request("GET"),
    updateBoard: (board) => request("PUT", board),
  };
};

export const boardToDto = toDto;
export const boardFromDto = toBoard;
