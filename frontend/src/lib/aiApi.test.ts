import { createAiApi, type BoardOperationRequest } from "@/lib/aiApi";

const request: BoardOperationRequest = {
  board: { columns: [], cards: {} },
  question: "Move the release card to Done",
  history: [{ role: "user", content: "Show me the board" }],
};

describe("AI API client", () => {
  it("sends the authenticated board operation request and maps the response", async () => {
    const response = {
      assistant_response: "I moved the card.",
      board_update: { columns: [], cards: {} },
    };
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(response),
    });

    await expect(createAiApi("Basic token", fetcher).boardOperation(request)).resolves.toEqual(response);
    expect(fetcher).toHaveBeenCalledWith("/api/ai/board-operation", {
      method: "POST",
      headers: { Authorization: "Basic token", "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  });

  it.each([
    [400, "The AI could not apply that board change."],
    [401, "Your session is no longer authorized."],
    [409, "The board changed while the AI was thinking. Refresh and try again."],
    [502, "The AI service is temporarily unavailable."],
  ])("maps HTTP %i failures to a useful message", async (status: number, message: string) => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status });
    await expect(createAiApi("Basic token", fetcher).boardOperation(request)).rejects.toThrow(message);
  });
});
