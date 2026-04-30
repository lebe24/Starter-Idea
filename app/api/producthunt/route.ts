import { NextResponse } from "next/server";

const PRODUCT_HUNT_GRAPHQL_URL = "https://api.producthunt.com/v2/api/graphql";
const PRODUCT_HUNT_OAUTH_TOKEN_URL = "https://api.producthunt.com/v2/oauth/token";

const PRODUCT_HUNT_QUERY = `
  query TopPosts {
    posts(first: 5, order: VOTES) {
      edges {
        node {
          id
          name
          tagline
          votesCount
          url
          createdAt
          thumbnail {
            url(width: 200, height: 200)
          }
          topics(first: 5) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    }
  }
`;

type OAuthTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GraphqlEnvelope = {
  data?: unknown;
  errors?: Array<{ message?: string; error?: string; error_description?: string }>;
};

let cachedClientToken: { token: string; expiresAtMs: number } | null = null;

function trimEnv(value: string | undefined): string | undefined {
  const t = value?.trim();
  return t || undefined;
}

/**
 * Developer / personal access tokens (Bearer). Does not use PH_API_Key when
 * PH_API_SECRET is set — in that pairing, PH_* are OAuth client_id + client_secret.
 */
function resolveStaticBearerToken(): string | undefined {
  const explicit =
    trimEnv(process.env.PRODUCT_HUNT_TOKEN) ??
    trimEnv(process.env.PH_TOKEN) ??
    trimEnv(process.env.PH_API_KEY);
  if (explicit) return explicit;
  if (trimEnv(process.env.PH_API_SECRET)) {
    return undefined;
  }
  return trimEnv(process.env.PH_API_Key);
}

function resolveClientCredentials(): { clientId: string; clientSecret: string } | undefined {
  const clientId =
    trimEnv(process.env.PH_CLIENT_ID) ??
    trimEnv(process.env.PRODUCT_HUNT_CLIENT_ID) ??
    (trimEnv(process.env.PH_API_SECRET) ? trimEnv(process.env.PH_API_Key) : undefined);
  const clientSecret =
    trimEnv(process.env.PH_CLIENT_SECRET) ??
    trimEnv(process.env.PRODUCT_HUNT_CLIENT_SECRET) ??
    trimEnv(process.env.PH_API_SECRET);
  if (!clientId || !clientSecret) return undefined;
  return { clientId, clientSecret };
}

async function fetchClientCredentialsAccessToken(): Promise<
  { ok: true; accessToken: string } | { ok: false; message: string }
> {
  const creds = resolveClientCredentials();
  if (!creds) {
    return {
      ok: false,
      message:
        "Missing OAuth pair: set PH_CLIENT_ID + PH_CLIENT_SECRET, or PH_API_Key + PH_API_SECRET.",
    };
  }

  if (cachedClientToken && Date.now() < cachedClientToken.expiresAtMs - 60_000) {
    return { ok: true, accessToken: cachedClientToken.token };
  }

  const response = await fetch(PRODUCT_HUNT_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as OAuthTokenResponse;

  if (!response.ok || !payload.access_token) {
    const message =
      payload.error_description ||
      payload.error ||
      `OAuth token request failed (${response.status})`;
    return { ok: false, message };
  }

  const expiresInSec =
    typeof payload.expires_in === "number" && Number.isFinite(payload.expires_in)
      ? payload.expires_in
      : 3600;

  cachedClientToken = {
    token: payload.access_token,
    expiresAtMs: Date.now() + expiresInSec * 1000,
  };

  return { ok: true, accessToken: payload.access_token };
}

async function resolveAccessToken(): Promise<
  | { ok: true; token: string; source: "bearer" | "client_credentials" }
  | { ok: false; message: string }
> {
  const staticToken = resolveStaticBearerToken();
  if (staticToken) {
    return { ok: true, token: staticToken, source: "bearer" };
  }

  const oauth = await fetchClientCredentialsAccessToken();
  if (oauth.ok) {
    return { ok: true, token: oauth.accessToken, source: "client_credentials" };
  }

  return {
    ok: false,
    message:
      "No Product Hunt credentials. Use PH_TOKEN or PRODUCT_HUNT_TOKEN (developer token), or PH_CLIENT_ID + PH_CLIENT_SECRET, or PH_API_Key + PH_API_SECRET (OAuth app).",
  };
}

async function fetchPostsWithToken(
  accessToken: string,
  source: "bearer" | "client_credentials",
): Promise<Response> {
  return fetch(PRODUCT_HUNT_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query: PRODUCT_HUNT_QUERY }),
    cache: "no-store",
  });
}

function parseGraphqlAuthError(text: string): string | undefined {
  try {
    const json = JSON.parse(text) as GraphqlEnvelope;
    const first = json.errors?.[0];
    if (!first) return undefined;
    return first.error_description || first.message || first.error;
  } catch {
    return undefined;
  }
}

export async function GET() {
  const resolved = await resolveAccessToken();
  if (!resolved.ok) {
    return NextResponse.json(
      { enabled: false, posts: [], error: resolved.message },
      { status: 200 },
    );
  }

  try {
    let response = await fetchPostsWithToken(resolved.token, resolved.source);
    let authSource: "bearer" | "client_credentials" = resolved.source;

    if (!response.ok && response.status === 401 && resolved.source === "bearer") {
      cachedClientToken = null;
      const oauthRetry = await fetchClientCredentialsAccessToken();
      if (oauthRetry.ok) {
        response = await fetchPostsWithToken(oauthRetry.accessToken, "client_credentials");
        authSource = "client_credentials";
      }
    }

    const rawText = await response.text();
    let payload: GraphqlEnvelope;
    try {
      payload = JSON.parse(rawText) as GraphqlEnvelope;
    } catch {
      return NextResponse.json(
        {
          enabled: true,
          posts: [],
          authSource,
          error: `Invalid JSON from Product Hunt (${response.status})`,
          upstreamStatus: response.status,
        },
        { status: 200 },
      );
    }

    if (!response.ok) {
      const detail =
        parseGraphqlAuthError(rawText) ||
        `Product Hunt HTTP ${response.status}`;
      return NextResponse.json(
        {
          enabled: true,
          posts: [],
          authSource,
          error: detail,
          upstreamStatus: response.status,
        },
        { status: 200 },
      );
    }

    if (payload.errors?.length) {
      const detail =
        payload.errors[0]?.error_description ||
        payload.errors[0]?.message ||
        payload.errors[0]?.error ||
        "GraphQL error from Product Hunt";
      return NextResponse.json(
        {
          enabled: true,
          posts: [],
          authSource,
          error: detail,
          upstreamStatus: response.status,
        },
        { status: 200 },
      );
    }

    const posts =
      (payload.data as { posts?: { edges?: Array<{ node: {
        id: string;
        name: string;
        tagline: string;
        votesCount: number;
        url: string;
        createdAt: string;
        thumbnail: { url: string } | null;
        topics?: { edges?: Array<{ node?: { name?: string } }> };
      } }> } } | undefined)?.posts?.edges?.map((edge) => ({
        id: edge.node.id,
        name: edge.node.name,
        tagline: edge.node.tagline,
        votesCount: edge.node.votesCount,
        url: edge.node.url,
        createdAt: edge.node.createdAt,
        thumbnail: edge.node.thumbnail,
        topics:
          edge.node.topics?.edges
            ?.map((topicEdge) => topicEdge.node?.name)
            .filter((topic): topic is string => Boolean(topic)) ?? [],
      })) ?? [];

    return NextResponse.json({
      enabled: true,
      posts,
      authSource,
    });
  } catch {
    return NextResponse.json(
      {
        enabled: true,
        posts: [],
        error: "Unexpected Product Hunt proxy error",
      },
      { status: 200 },
    );
  }
}
