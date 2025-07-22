import {GoogleAuth} from "google-auth-library";

interface GoogleAuthConfig {
  credentials: {
    client_email: string;
    private_key: string;
  };
  scopes: string[];
}

export async function getGoogleSpeechToTextAuthToken(): Promise<string> {
  try {
    // Validate environment variables
    if (
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY
    ) {
      throw new Error(
        "Missing Google Cloud credentials in environment variables"
      );
    }

    const authConfig: GoogleAuthConfig = {
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    };

    const auth = new GoogleAuth(authConfig);
    const client = await auth.getClient();
    const {token} = await client.getAccessToken();

    if (!token) {
      throw new Error("Failed to obtain access token");
    }

    return token;
  } catch (error) {
    console.error("Error generating Google auth token:", error);
    throw new Error(
      `Failed to generate Google auth token: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function getGoogleAgentAuthToken(): Promise<string> {
  try {
    if (
      !process.env.GOOGLE_PRIVATE_KEY ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    ) {
      throw new Error("Google credentials not configured");
    }

    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const client = await auth.getClient();
    const {token} = await client.getAccessToken();

    if (!token) {
      throw new Error("Failed to obtain access token");
    }

    return token;
  } catch (error) {
    console.error("Error generating Google auth token:", error);
    throw new Error(
      `Failed to generate Google auth token: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
