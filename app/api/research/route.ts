import { readJSON } from "@/lib/http";
import { NextRequest } from "next/server";
import { guard } from "@/lib/guard";
import { research } from "@/lib/research";
import { z } from "zod";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(req: NextRequest) {
  try {
    guard(req, "research");
    const { input, scenario } = z
      .object({
        input: z.string().trim().min(2).max(240),
        scenario: z
          .string()
          .max(1000)
          .default("External users; OAuth app setup and approval"),
      })
      .parse(await readJSON(req));
    const encoder = new TextEncoder();
    const cancellation = new AbortController();
    let closed = false;
    const signal = AbortSignal.any([req.signal, cancellation.signal]);
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (event: string, data: unknown) => {
          if (closed || signal.aborted) return;
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        };
        try {
          await research(input, scenario, emit, { signal });
        } catch (e) {
          emit("error", {
            message:
              e instanceof Error
                ? e.message
                : "Investigation failed; requirements remain unresolved.",
          });
        } finally {
          if (!closed) {
            closed = true;
            controller.close();
          }
        }
      },
      cancel() {
        closed = true;
        cancellation.abort();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof z.ZodError
            ? "Enter a provider name (2–240 characters) and a use case of at most 1,000 characters."
            : e instanceof Error
              ? e.message
              : "Invalid request",
      },
      { status: 400 },
    );
  }
}
