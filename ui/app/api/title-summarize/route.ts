// pages/api/reasoning-engine.ts
import {getGoogleAgentAuthToken} from "../../lib/google-auth";
import {NextResponse} from "next/server";

export async function POST(req: Request) {
  try {
    const token = await getGoogleAgentAuthToken();

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const agentId = process.env.NEXT_PUBLIC_TITLE_SUMMARIZER_AGENTID;
    if (!projectId) {
      throw new Error("GOOGLE_CLOUD_PROJECT_ID not configured");
    }

    const {message} = await req.json();

    const apiUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/reasoningEngines/${agentId}:streamQuery?alt=sse`;
    // const apiUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/gen-lang-client-0866166683/locations/us-central1/reasoningEngines/61528670690344960:streamQuery?alt=sse`;

    const vertexResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        input: {message, user_id: '1234'},
      }),
    });

    if (!vertexResponse.ok) {
      const error = await vertexResponse.text();
      throw new Error(`Vertex AI API error: ${error}`);
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = vertexResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const {done, value} = await reader.read();
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });
    console.log("STREAM ====> ", stream)
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in reasoning engine API:", error);
    return NextResponse.json(
      {
        error: "Error processing request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      {status: 500}
    );
  }
}
