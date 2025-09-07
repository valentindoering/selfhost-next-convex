import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
  }

  try {
    const resp = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime",
        },
      }),
    });

    if (!resp.ok) {
      let detail: unknown = null;
      try { detail = await resp.json(); } catch { detail = await resp.text(); }
      const errorMessage = typeof detail === "string" && detail.trim().length > 0
        ? detail
        : "Failed to create client secret";
      return NextResponse.json({ error: errorMessage }, { status: resp.status });
    }

    const data = await resp.json();
    const value =
      data?.client_secret?.value ??
      data?.clientSecret?.value ??
      data?.value ??
      data?.secret ??
      data?.client_secret;
    if (!value || typeof value !== "string") {
      return NextResponse.json({ error: "Malformed response from OpenAI", raw: data }, { status: 500 });
    }

    return NextResponse.json({ token: value });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


