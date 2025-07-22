import {getGoogleSpeechToTextAuthToken} from "../../lib/google-auth";
import {NextResponse} from "next/server";

// Define TypeScript interfaces for request/response
interface SpeechRecognitionRequest {
  audio: string;
}

interface GoogleSpeechConfig {
  encoding: string;
  sampleRateHertz: number;
  languageCode: string;
}

interface GoogleSpeechRequest {
  config: GoogleSpeechConfig;
  audio: {
    content: string;
  };
}

interface GoogleSpeechResponse {
  results?: {
    alternatives: {
      transcript: string;
      confidence: number;
    }[];
  }[];
  error?: {
    message: string;
  };
}

export async function POST(request: Request) {
  try {
    // Validate request
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        {error: "Invalid content type, expected application/json"},
        {status: 400}
      );
    }

    const {audio} = (await request.json()) as SpeechRecognitionRequest;

    if (!audio) {
      return NextResponse.json(
        {error: "Audio data is required"},
        {status: 400}
      );
    }

    // Extract base64 data (handle both with and without data URI prefix)
    const base64Audio = audio.startsWith("data:") ? audio.split(",")[1] : audio;

    // Get authentication token
    const authToken = await getGoogleSpeechToTextAuthToken();
    if (!authToken) {
      throw new Error("Failed to obtain authentication token");
    }

    // Prepare request payload
    const payload: GoogleSpeechRequest = {
      config: {
        encoding: "MP3",
        sampleRateHertz: 16000,
        languageCode: "en-US", // Kannada language code
        // languageCode: process.env.LANGUAGE_CODE || "en-US", // Kannada language code
      },
      audio: {
        content: base64Audio,
      },
    };

    // Call Google Speech API
    const apiResponse = await fetch(
      `${process.env.SPEECH_TO_TEXT}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    // Handle API response
    if (!apiResponse.ok) {
      const errorData = (await apiResponse.json()) as GoogleSpeechResponse;
      throw new Error(
        errorData.error?.message ||
          `Google API request failed with status ${apiResponse.status}`
      );
    }

    const data = (await apiResponse.json()) as GoogleSpeechResponse;

    // Validate response structure
    if (!data.results || data.results.length === 0) {
      return NextResponse.json(
        {error: "No transcription results returned"},
        {status: 404}
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      },
      {status: 500}
    );
  }
}
