import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@search/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@search/app/actions/auth-actions", () => ({
  signInAction: vi.fn(),
  signOutAction: vi.fn(),
}));
// Isolate gating logic from the full chat UI — ChatApp has its own tests elsewhere.
vi.mock("@search/app/components/ChatApp", () => ({
  ChatApp: () => <div data-testid="chat-app-stub" />,
}));

import { auth } from "@search/lib/auth";
import Home from "@search/app/page";

// next-auth's `auth` is a heavily overloaded function (Server Components,
// Route Handlers, middleware, ...); cast to the plain async-mock shape this
// test actually exercises rather than fighting the overload resolution.
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

describe("Home", () => {
  it("renders a sign-in prompt when unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    render(await Home());
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders the chat app when authenticated", async () => {
    mockedAuth.mockResolvedValue({ user: { email: "a@b.com" } });
    render(await Home());
    expect(screen.getByTestId("chat-app-stub")).toBeInTheDocument();
  });
});
