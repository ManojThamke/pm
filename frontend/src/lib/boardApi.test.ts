import {
  boardFromDto,
  boardToDto,
  createBoardApi,
  type BoardDto,
} from "@/lib/boardApi";
import { initialData } from "@/lib/kanban";

const dto: BoardDto = {
  columns: [{ id: "column-1", title: "Todo", cardIds: ["card-1"] }],
  cards: { "card-1": { id: "card-1", title: "Task", details: "Details" } },
};

describe("board API client", () => {
  it("maps board values into independent API DTOs and back", () => {
    const mapped = boardToDto(initialData);
    expect(mapped).toEqual(initialData);
    mapped.columns[0].cardIds.push("other");
    expect(initialData.columns[0].cardIds).not.toContain("other");

    const board = boardFromDto(dto);
    expect(board).toEqual(dto);
    board.columns[0].cardIds.push("other");
    expect(dto.columns[0].cardIds).not.toContain("other");
  });

  it("constructs authenticated GET requests and parses JSON", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(dto),
    });
    const api = createBoardApi("Basic token", fetcher);

    await expect(api.getBoard()).resolves.toEqual(dto);
    expect(fetcher).toHaveBeenCalledWith("/api/board", {
      method: "GET",
      headers: { Authorization: "Basic token" },
    });
  });

  it("constructs PUT requests with JSON and parses the response", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(dto),
    });
    const api = createBoardApi("Basic token", fetcher);

    await expect(api.updateBoard(dto)).resolves.toEqual(dto);
    expect(fetcher).toHaveBeenCalledWith("/api/board", {
      method: "PUT",
      headers: {
        Authorization: "Basic token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dto),
    });
  });

  it("reports non-401 API failures", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const api = createBoardApi("Basic token", fetcher);

    await expect(api.getBoard()).rejects.toThrow("Unable to save the board.");
  });

  it("reports unauthorized API failures", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    const api = createBoardApi("Basic token", fetcher);

    await expect(api.updateBoard(dto)).rejects.toThrow(
      "Your session is no longer authorized."
    );
  });
});
