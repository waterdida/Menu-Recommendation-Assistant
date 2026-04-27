export function parseEventStream(buffer) {
  const events = [];
  const blocks = buffer.split("\n\n");
  const rest = blocks.pop() || "";

  for (const block of blocks) {
    let event = "message";
    let data = "";

    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data += line.slice(5).trim();
    }

    if (data) events.push({ event, data: JSON.parse(data) });
  }

  return { events, rest };
}
