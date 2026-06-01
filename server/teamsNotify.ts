import { ENV } from "./_core/env";

interface TeamsNotificationOptions {
  title: string;
  message: string;
  facts?: Array<{ title: string; value: string }>;
  actionUrl?: string;
  actionLabel?: string;
  themeColor?: "good" | "warning" | "attention" | "default";
}

/**
 * Send a notification to Microsoft Teams via Power Automate webhook.
 * Uses Adaptive Card format as required by the new Power Automate workflows.
 *
 * @returns true if sent successfully, false otherwise
 */
export async function sendTeamsNotification(
  options: TeamsNotificationOptions
): Promise<boolean> {
  const webhookUrl = ENV.teamsWebhookUrl;

  if (!webhookUrl) {
    console.warn("[Teams] No webhook URL configured, skipping notification");
    return false;
  }

  const accentColorMap: Record<string, string> = {
    good: "Good",
    warning: "Warning",
    attention: "Attention",
    default: "Default",
  };

  const style = accentColorMap[options.themeColor ?? "default"] ?? "Default";

  // Build the body items
  const bodyItems: any[] = [
    {
      type: "TextBlock",
      size: "Medium",
      weight: "Bolder",
      text: options.title,
      wrap: true,
      style: style === "Default" ? undefined : "heading",
    },
    {
      type: "TextBlock",
      text: options.message,
      wrap: true,
    },
  ];

  // Add facts as a FactSet if provided
  if (options.facts && options.facts.length > 0) {
    bodyItems.push({
      type: "FactSet",
      facts: options.facts.map((f) => ({
        title: f.title,
        value: f.value,
      })),
    });
  }

  // Build the adaptive card payload
  const payload: any = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: bodyItems,
          actions: options.actionUrl
            ? [
                {
                  type: "Action.OpenUrl",
                  title: options.actionLabel ?? "Open RankPilot",
                  url: options.actionUrl,
                },
              ]
            : [],
        },
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(
        `[Teams] Webhook failed (${response.status}): ${text}`
      );
      return false;
    }

    console.log(`[Teams] Notification sent: ${options.title}`);
    return true;
  } catch (error) {
    console.error("[Teams] Failed to send notification:", error);
    return false;
  }
}
