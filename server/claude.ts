/**
 * Claude (Anthropic) LLM provider.
 *
 * Accepts the same InvokeParams / InvokeResult contract used by the built-in
 * Forge provider so callers can swap providers transparently.
 */
import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./_core/env";
import type {
  InvokeParams,
  InvokeResult,
  Message,
  MessageContent,
  TextContent,
  ImageContent,
} from "./_core/llm";

// ---------------------------------------------------------------------------
// Helpers to convert our generic message format → Anthropic SDK format
// ---------------------------------------------------------------------------

type AnthropicContent =
  | string
  | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>;

function toAnthropicContent(content: MessageContent | MessageContent[]): AnthropicContent {
  const parts = Array.isArray(content) ? content : [content];

  // Single string shortcut
  if (parts.length === 1 && typeof parts[0] === "string") {
    return parts[0];
  }

  const blocks: Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam> = [];

  for (const part of parts) {
    if (typeof part === "string") {
      blocks.push({ type: "text", text: part });
    } else if (part.type === "text") {
      blocks.push({ type: "text", text: (part as TextContent).text });
    } else if (part.type === "image_url") {
      const url = (part as ImageContent).image_url.url;
      // Anthropic supports base64 and URLs
      if (url.startsWith("data:")) {
        const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          blocks.push({
            type: "image",
            source: {
              type: "base64",
              media_type: match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: match[2],
            },
          });
        }
      } else {
        blocks.push({
          type: "image",
          source: {
            type: "url",
            url,
          },
        });
      }
    }
    // file_url is not natively supported by Claude — skip gracefully
  }

  return blocks;
}

function convertMessages(messages: Message[]): {
  system: string | undefined;
  anthropicMessages: Anthropic.MessageParam[];
} {
  let system: string | undefined;
  const anthropicMessages: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      // Anthropic uses a top-level `system` parameter
      const content = typeof msg.content === "string"
        ? msg.content
        : Array.isArray(msg.content)
          ? msg.content.map((p) => (typeof p === "string" ? p : "text" in p ? p.text : "")).join("\n")
          : "";
      system = system ? `${system}\n\n${content}` : content;
      continue;
    }

    // Map assistant / user / tool roles
    const role: "user" | "assistant" =
      msg.role === "assistant" ? "assistant" : "user";

    anthropicMessages.push({
      role,
      content: toAnthropicContent(msg.content),
    });
  }

  return { system, anthropicMessages };
}

// ---------------------------------------------------------------------------
// Public API — mirrors invokeLLM signature
// ---------------------------------------------------------------------------

const CLAUDE_MODELS = [
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
] as const;

export type ClaudeModel = (typeof CLAUDE_MODELS)[number];

export const AVAILABLE_CLAUDE_MODELS = CLAUDE_MODELS.map((m) => ({
  id: m,
  label: m === "claude-sonnet-4-20250514"
    ? "Claude Sonnet 4"
    : m === "claude-sonnet-4-6"
    ? "Claude Sonnet 4.6 (Latest)"
    : m === "claude-haiku-4-5"
    ? "Claude Haiku 4.5 (Fast)"
    : m,
}));

export async function invokeClaudeLLM(
  params: InvokeParams,
  model?: string
): Promise<InvokeResult> {
  if (!ENV.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey: ENV.anthropicApiKey });
  let { system, anthropicMessages } = convertMessages(params.messages);

  const maxTokens =
    params.maxTokens ?? params.max_tokens ?? 8192;

  const selectedModel = model || "claude-sonnet-4-20250514";

  // Claude doesn't support response_format / json_schema natively.
  // Instead, we inject a JSON instruction into the system prompt so Claude
  // returns well-formed JSON that matches the expected schema.
  const responseFormat = params.responseFormat ?? params.response_format;
  if (responseFormat && responseFormat.type === "json_schema") {
    const schemaHint = JSON.stringify(responseFormat.json_schema.schema, null, 2);
    const jsonInstruction = `\n\nIMPORTANT: You MUST respond with ONLY valid JSON matching this schema — no markdown code fences, no explanation:\n${schemaHint}`;
    system = system ? `${system}${jsonInstruction}` : jsonInstruction;
  } else if (responseFormat && responseFormat.type === "json_object") {
    const jsonInstruction = `\n\nIMPORTANT: You MUST respond with ONLY valid JSON — no markdown code fences, no explanation.`;
    system = system ? `${system}${jsonInstruction}` : jsonInstruction;
  }

  const response = await client.messages.create({
    model: selectedModel,
    max_tokens: maxTokens,
    system: system || undefined,
    messages: anthropicMessages,
  });

  // Convert Anthropic response → our InvokeResult format
  const textContent = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const result: InvokeResult = {
    id: response.id,
    created: Date.now(),
    model: response.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: textContent,
        },
        finish_reason: response.stop_reason ?? "stop",
      },
    ],
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };

  return result;
}
