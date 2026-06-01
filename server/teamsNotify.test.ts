import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the sendTeamsNotification function by mocking fetch
// and verifying the correct payload format is sent

describe("Teams Notification", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("should send an adaptive card payload to the webhook URL", async () => {
    // Mock ENV
    vi.doMock("./_core/env", () => ({
      ENV: {
        teamsWebhookUrl: "https://example.com/webhook",
      },
    }));

    // Mock fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { sendTeamsNotification } = await import("./teamsNotify");

    const result = await sendTeamsNotification({
      title: "Test Notification",
      message: "This is a test message",
      facts: [
        { title: "Count", value: "5" },
        { title: "Status", value: "Ready" },
      ],
      actionUrl: "https://example.com/pipeline",
      actionLabel: "View Briefs",
    });

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://example.com/webhook");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(options.body);
    expect(body.type).toBe("message");
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0].contentType).toBe(
      "application/vnd.microsoft.card.adaptive"
    );

    const card = body.attachments[0].content;
    expect(card.type).toBe("AdaptiveCard");
    expect(card.version).toBe("1.4");

    // Check body has title, message, and facts
    expect(card.body).toHaveLength(3); // title + message + factset
    expect(card.body[0].text).toBe("Test Notification");
    expect(card.body[1].text).toBe("This is a test message");
    expect(card.body[2].type).toBe("FactSet");
    expect(card.body[2].facts).toHaveLength(2);

    // Check action
    expect(card.actions).toHaveLength(1);
    expect(card.actions[0].type).toBe("Action.OpenUrl");
    expect(card.actions[0].url).toBe("https://example.com/pipeline");

    vi.unstubAllGlobals();
  });

  it("should return false when no webhook URL is configured", async () => {
    vi.doMock("./_core/env", () => ({
      ENV: {
        teamsWebhookUrl: "",
      },
    }));

    const { sendTeamsNotification } = await import("./teamsNotify");

    const result = await sendTeamsNotification({
      title: "Test",
      message: "Should not send",
    });

    expect(result).toBe(false);
  });

  it("should return false when webhook returns non-OK status", async () => {
    vi.doMock("./_core/env", () => ({
      ENV: {
        teamsWebhookUrl: "https://example.com/webhook",
      },
    }));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve("Bad Request"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { sendTeamsNotification } = await import("./teamsNotify");

    const result = await sendTeamsNotification({
      title: "Test",
      message: "Should fail",
    });

    expect(result).toBe(false);
    vi.unstubAllGlobals();
  });

  it("should return false when fetch throws an error", async () => {
    vi.doMock("./_core/env", () => ({
      ENV: {
        teamsWebhookUrl: "https://example.com/webhook",
      },
    }));

    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    const { sendTeamsNotification } = await import("./teamsNotify");

    const result = await sendTeamsNotification({
      title: "Test",
      message: "Should fail",
    });

    expect(result).toBe(false);
    vi.unstubAllGlobals();
  });

  it("should omit actions when no actionUrl is provided", async () => {
    vi.doMock("./_core/env", () => ({
      ENV: {
        teamsWebhookUrl: "https://example.com/webhook",
      },
    }));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { sendTeamsNotification } = await import("./teamsNotify");

    await sendTeamsNotification({
      title: "No Action",
      message: "No link",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const card = body.attachments[0].content;
    expect(card.actions).toHaveLength(0);

    vi.unstubAllGlobals();
  });
});
