import assert from "node:assert/strict";
import test from "node:test";
import { addLineNumbers, snippetsFromTextMatches } from "./search_github.js";

test("snippetsFromTextMatches filters missing fragments and collects matched text", () => {
  const snippets = snippetsFromTextMatches([
    {
      object_type: "FileContent",
      property: "content",
      fragment: "const answer = 42;",
      matches: [{ text: "answer" }, {}, { text: "42" }],
    },
    { object_type: "FileContent", property: "content", fragment: "", matches: [{ text: "ignored" }] },
    { object_type: "FileContent", property: "content", matches: [{ text: "ignored" }] },
    {
      object_type: "FileContent",
      property: "content",
      fragment: "export default answer;",
      matches: [{ text: "default" }],
    },
  ]);

  assert.deepEqual(snippets, [
    {
      objectType: "FileContent",
      property: "content",
      fragment: "const answer = 42;",
      matchedText: ["answer", "42"],
    },
    {
      objectType: "FileContent",
      property: "content",
      fragment: "export default answer;",
      matchedText: ["default"],
    },
  ]);
});

test("addLineNumbers returns the original snippet when the fragment is not found", () => {
  const snippet = { objectType: "FileContent", property: "content", fragment: "missing", matchedText: ["missing"] };

  assert.equal(addLineNumbers("present only", snippet), snippet);
});

test("addLineNumbers can start after an earlier duplicate fragment", () => {
  const snippet = { objectType: "FileContent", property: "content", fragment: "duplicate", matchedText: ["duplicate"] };
  const content = "duplicate\nmiddle\nduplicate";
  const result = addLineNumbers(content, snippet, "duplicate\nmiddle\n".length);

  assert.deepEqual(result, {
    ...snippet,
    startLine: 3,
    endLine: 3,
    content: "3: duplicate",
  });
});
