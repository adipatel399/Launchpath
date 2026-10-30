import { test } from "node:test";
import assert from "node:assert/strict";
import { research, type ResearchDependencies } from "../lib/research";
import { screenPermissionEvidence } from "../lib/permission-evidence";

// Deterministic evidence fixtures exercise orchestration and failure boundaries.
// Real model/provider observations are recorded separately in docs/TESTING.md.
const document = {
  id: "s1",
  url: "https://provider.example/oauth",
  text: "Register a public OAuth app. The profile.read scope reads profiles. profile.write updates profiles. Provider review requirements remain unknown.",
};
const draft = () => ({
  name: "Provider",
  domain: "provider.example",
  category: "Developer tools",
  description: "Profile integration",
  verdict: "Register an OAuth app; confirm public review requirements.",
  effort: "Planning estimate: 1–2 hours",
  wait: "None",
  estimateBasis: "Planning estimate; no published SLA.",
  scopes: [
    {
      name: "profile.read",
      purpose: "Read profiles",
      classification: "Provider scope",
      sourceIds: ["s1"],
      evidenceSourceId: "s1",
      evidenceQuote: "profile.read scope reads profiles",
    },
  ],
  steps: [
    {
      id: "register",
      title: "Register the app",
      detail: "Use the provider registration console.",
      owner: "Developer",
      done: "An app identity exists.",
      condition: "Always",
      sourceIds: ["s1"],
    },
  ],
  blockers: [],
  unknowns: ["Public review requirements are unresolved."],
  followupQuery: "Provider OAuth public distribution review",
});
function dependencies(
  overrides: ResearchDependencies = {},
): ResearchDependencies {
  return {
    search: async () => [
      {
        url: document.url,
        title: "Official OAuth documentation",
        content: "Search snippet is not evidence",
      },
    ],
    retrieve: async () => ({
      text: document.text,
      url: document.url,
      retrieval: "direct",
    }),
    generate: async () => draft(),
    save: async () => {},
    ...overrides,
  };
}
test("two-pass investigation saves only supported permissions and qualifies unsupported zero-wait claims", async () => {
  let saved = 0;
  const events: string[] = [];
  const guide = await research(
    "Provider",
    "read-only profiles",
    (e) => events.push(e),
    dependencies({
      save: async () => {
        saved++;
      },
    }),
  );
  assert.equal(saved, 1);
  assert.equal(guide.scopes[0].name, "profile.read");
  assert.equal(guide.permissionsEvidenceChecked, true);
  assert.match(guide.wait, /No published/);
  assert.equal(events.at(-1), "complete");
  assert.match(guide.tested, /second model/);
  assert.ok(guide.steps.some((s) => s.id === "confirm-release-requirements"));
});
test("HTML table cells preserve permission-name boundaries for source checks", async () => {
  const { textOf } = await import("../lib/safe-fetch");
  const text = textOf(
    "<main><table><tr><td>identify</td><td>allows <code>/users/@me</code> without <code>email</code></td></tr></table></main>",
  );
  const permission = {
    ...draft().scopes[0],
    name: "identify",
    evidenceQuote: "identify allows `/users/@me` without `email`",
  };
  const result = screenPermissionEvidence(
    [permission],
    [{ ...document, text }],
    "Discord",
    "read-only profile",
  );
  assert.equal(result.scopes.length, 1);
});
test("invented permission names and write access for read-only use are withheld", () => {
  const base = draft().scopes[0];
  const result = screenPermissionEvidence(
    [
      { ...base, name: "Provider API", evidenceQuote: "Provider API" },
      { ...base, name: "profile.admin", evidenceQuote: "profile.admin" },
      {
        ...base,
        name: "profile.write",
        evidenceQuote: "profile.write updates profiles",
      },
      base,
    ],
    [document],
    "Provider",
    "read-only profiles",
  );
  assert.deepEqual(
    result.scopes.map((s) => s.name),
    ["profile.read"],
  );
  assert.equal(result.unknowns.length, 3);
});
test("an incomplete second review retains qualified first-pass evidence", async () => {
  let count = 0;
  const guide = await research(
    "Provider",
    "read-only",
    () => {},
    dependencies({
      search: async () => {
        if (++count > 1) throw Error("Search timeout");
        return [
          { url: document.url, title: "Official OAuth", content: "snippet" },
        ];
      },
    }),
  );
  assert.match(guide.tested, /incomplete/);
  assert.ok(guide.unknowns.some((s) => s.includes("second evidence review")));
  assert.equal(guide.scopes.length, 1);
});
test("no readable source and initial search failure cannot publish a guide", async () => {
  let saved = false;
  const save = async () => {
    saved = true;
  };
  await assert.rejects(
    () =>
      research(
        "Provider",
        "read-only",
        () => {},
        dependencies({
          retrieve: async () => {
            throw Error("No document");
          },
          save,
        }),
      ),
    /No readable sources/,
  );
  await assert.rejects(
    () =>
      research(
        "Provider",
        "read-only",
        () => {},
        dependencies({
          search: async () => {
            throw Error("Search unavailable");
          },
          save,
        }),
      ),
    /Search unavailable/,
  );
  assert.equal(saved, false);
});
test("model citations outside retrieved documents fail before publication", async () => {
  let saved = false;
  await assert.rejects(
    () =>
      research(
        "Provider",
        "read-only",
        () => {},
        dependencies({
          generate: async () => {
            const value = draft();
            value.steps[0].sourceIds = ["invented"];
            return value;
          },
          save: async () => {
            saved = true;
          },
        }),
      ),
    /outside the inspected/,
  );
  assert.equal(saved, false);
});
test("cancelled investigations never save a completed guide", async () => {
  const cancellation = new AbortController();
  let saved = false;
  await assert.rejects(
    () =>
      research(
        "Provider",
        "read-only",
        () => {},
        dependencies({
          signal: cancellation.signal,
          generate: async () => {
            cancellation.abort();
            return draft();
          },
          save: async () => {
            saved = true;
          },
        }),
      ),
    /abort/i,
  );
  assert.equal(saved, false);
});
test("second review cannot restore claims supported only by excluded secondary evidence", async () => {
  let pass = 0;
  const guide = await research(
    "Provider",
    "read-only",
    () => {},
    dependencies({
      search: async () => [
        { url: document.url, title: "Official", content: "snippet" },
        {
          url: "https://blog.example/tutorial",
          title: "Secondary",
          content: "snippet",
        },
      ],
      retrieve: async (item) => ({
        text: document.text,
        url: item.url,
        retrieval: "direct",
      }),
      generate: async (_prompt, ids) => {
        const value = draft();
        if (++pass === 2) {
          assert.deepEqual(ids, ["s1"]);
          value.steps[0].sourceIds = ["s2"];
        }
        return value;
      },
    }),
  );
  assert.match(guide.tested, /incomplete/);
  assert.deepEqual(
    guide.sources.map((s) => s.id),
    ["s1"],
  );
});

test("a documented review blocker becomes an actionable release step rather than a claim that no process was found", async () => {
  const guide = await research(
    "Provider",
    "read-only",
    () => {},
    dependencies({
      generate: async () => ({
        ...draft(),
        blockers: [
          {
            title: "Public app review",
            detail: "External apps require review.",
            action: "Submit scope justification and a test walkthrough.",
            owner: "Developer",
            sourceIds: ["s1"],
          },
        ],
      }),
    }),
  );
  const release = guide.steps.find(
    (step) => step.id === "confirm-release-requirements",
  )!;
  assert.equal(release.title, "Public app review");
  assert.match(release.detail, /Submit scope justification/);
  assert.doesNotMatch(release.detail, /did not establish/);
  assert.ok(
    !guide.unknowns.some((item) =>
      item.includes("process was not established"),
    ),
  );
});
