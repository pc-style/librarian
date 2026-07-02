#!/usr/bin/env node
const baseUrl = process.env.LIBRARIAN_BASE_URL ?? "https://librarian.pcstyle.dev";
const apiKey = process.env.LIBRARIAN_API_KEY ?? "test123";
const question = process.argv.slice(2).join(" ").trim();

if (!question) {
  console.error('Usage: ask-librarian.mjs "<question>"');
  process.exit(1);
}

const headers = {
  "content-type": "application/json",
  authorization: `Bearer ${apiKey}`,
};

async function main() {
  const sessionResponse = await fetch(`${baseUrl}/eve/v1/session`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message: question }),
  });

  if (!sessionResponse.ok) {
    const body = await sessionResponse.text();
    throw new Error(`Failed to create Librarian session (${sessionResponse.status}): ${body}`);
  }

  const session = await sessionResponse.json();
  if (!session.sessionId) throw new Error(`Missing sessionId in response: ${JSON.stringify(session)}`);

  const streamResponse = await fetch(`${baseUrl}/eve/v1/session/${session.sessionId}/stream`, {
    headers: { authorization: `Bearer ${apiKey}` },
  });

  if (!streamResponse.ok) {
    const body = await streamResponse.text();
    throw new Error(`Failed to stream Librarian session (${streamResponse.status}): ${body}`);
  }

  const messages = [];
  let pending = "";

  if (!streamResponse.body) {
    throw new Error("Librarian stream response did not include a readable body.");
  }

  const reader = streamResponse.body.getReader();
  const decoder = new TextDecoder();

  for (;;) {
    const { done, value } = await reader.read();
    pending += decoder.decode(value, { stream: !done });
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";

    for (const line of lines) {
      handleEventLine(line, messages);
    }

    if (done) break;
  }

  handleEventLine(pending, messages);

  const answer = messages.at(-1);
  if (!answer) throw new Error("Librarian stream completed without a message.completed event.");
  process.stdout.write(`${answer}\n`);
}

function handleEventLine(line, messages) {
  if (!line.trim()) return;
  try {
    const event = JSON.parse(line);
    if (event.type === "message.completed" && event.data?.message) {
      messages.push(event.data.message);
    }
    if ((event.type === "session.failed" || event.type === "turn.failed") && event.data) {
      throw new Error(JSON.stringify(event.data));
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Malformed Librarian stream event: ${line}`);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
