import type { BoardDto } from "@/lib/boardApi";

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type BoardOperationRequest = {
  board: BoardDto;
  question: string;
  history: ConversationMessage[];
};

export type BoardOperationResponse = {
  assistant_response: string;
  board_update: BoardDto | null;
};

export type AiApi = {
  boardOperation: (request: BoardOperationRequest) => Promise<BoardOperationResponse>;
};

export const createAiApi = (authorization: string, fetcher = fetch): AiApi => ({
  boardOperation: async (request) => {
    const response = await fetcher("/api/ai/board-operation", {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const messages: Record<number, string> = {
        400: "The AI could not apply that board change.",
        401: "Your session is no longer authorized.",
        409: "The board changed while the AI was thinking. Refresh and try again.",
        502: "The AI service is temporarily unavailable.",
        503: "The AI service is not configured.",
      };
      throw new Error(messages[response.status] ?? "Unable to complete the AI request.");
    }

    return (await response.json()) as BoardOperationResponse;
  },
});
