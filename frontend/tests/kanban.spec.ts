import { expect, test, type Page } from "@playwright/test";
const authHeaders = {
  Authorization: `Basic ${Buffer.from("user:password").toString("base64")}`,
};
const signIn = async (page: Page) => {
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  const boardLoaded = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/board") &&
      response.request().method() === "GET" &&
      response.ok()
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await boardLoaded;
};

test("loads the kanban board", async ({ page }) => {
  await page.goto("/");
  await signIn(page);
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("adds a card to a column", async ({ page }) => {
  await page.goto("/");
  await signIn(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/board") &&
      response.request().method() === "PUT" &&
      response.ok()
  );
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await saved;
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
  const removed = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/board") &&
      response.request().method() === "PUT" &&
      response.ok()
  );
  await firstColumn.getByTestId(/card-/).getByRole("button", { name: /delete playwright card/i }).click();
  await removed;
});

test("moves a card between columns", async ({ page }) => {
  await page.goto("/");
  await signIn(page);
  const card = page.locator('[data-testid^="card-"]').first();
  const targetColumn = page.locator('[data-testid^="column-"]').nth(3);
  await expect(card).toBeVisible();
  await expect(targetColumn).toBeVisible();
  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) {
    throw new Error("Unable to resolve drag coordinates.");
  }

  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    columnBox.x + columnBox.width / 2,
    columnBox.y + 120,
    { steps: 12 }
  );
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/board") &&
      response.request().method() === "PUT" &&
      response.ok()
  );
  await page.mouse.up();
  await saved;
  await expect(targetColumn.locator('[data-testid^="card-"]').first()).toBeVisible();
});

test("requires valid credentials and persists the session across refresh", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in to Kanban Studio" })).toBeVisible();
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("incorrect");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("form [role=alert]")).toContainText(
    "username or password is incorrect"
  );
  await expect(page.getByRole("heading", { name: "Sign in to Kanban Studio" })).toBeVisible();
  await signIn(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
});

test("persists board edits across reload and a fresh API read", async ({ page, request }) => {
  await page.goto("/");
  await signIn(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  const title = firstColumn.getByLabel("Column title");
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/board") &&
      response.request().method() === "PUT" &&
      response.ok()
  );
  await title.fill("Persisted backlog");
  await title.blur();
  await saved;
  await expect(title).toHaveValue("Persisted backlog");
  await page.reload();
  await expect(
    page.locator('[data-testid^="column-"]').first().getByLabel("Column title")
  ).toHaveValue("Persisted backlog");

  const response = await request.get("/api/board", {
    headers: authHeaders,
  });
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).columns[0].title).toBe("Persisted backlog");
});

test("logs out and protects the board again", async ({ page }) => {
  await page.goto("/");
  await signIn(page);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to Kanban Studio" })).toBeVisible();
  await expect(page.getByTestId("column-col-backlog")).not.toBeVisible();
});

test("uses the AI chat and refreshes an AI board update", async ({ page }) => {
  let updatedBoard: unknown = null;
  await page.route("**/api/ai/board-operation", async (route) => {
    const request = route.request().postDataJSON();
    updatedBoard = {
      ...request.board,
      cards: {
        ...request.board.cards,
        "card-ai": { id: "card-ai", title: "AI card", details: "Created by the copilot." },
      },
      columns: request.board.columns.map((column: { id: string; cardIds: string[] }) =>
        column.id === "col-backlog"
          ? { ...column, cardIds: [...column.cardIds, "card-ai"] }
          : column
      ),
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        assistant_response: "I created the card.",
        board_update: updatedBoard,
      }),
    });
  });
  await page.route("**/api/board", async (route) => {
    if (route.request().method() === "GET" && updatedBoard) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(updatedBoard),
      });
      return;
    }
    await route.continue();
  });

  await page.goto("/");
  await signIn(page);
  await page.getByRole("button", { name: /open ai chat/i }).click();
  await page.getByPlaceholder("What should change?").fill("Create an AI card");
  const operation = page.waitForResponse((response) =>
    response.url().endsWith("/api/ai/board-operation")
  );
  await page.getByRole("button", { name: "Send" }).click();
  await operation;
  await expect(page.getByText("I created the card.")).toBeVisible();
  await expect(page.getByText("AI card")).toBeVisible();
});
