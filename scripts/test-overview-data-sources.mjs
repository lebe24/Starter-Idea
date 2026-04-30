const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${url} -> ${response.status}`);
  }
  return response.json();
}

async function run() {
  console.log("Testing Overview data sources...\n");

  const ideas = await fetchJson(`${BASE_URL}/api/ideas`);
  console.log(`Ideas API: ${ideas.ideas?.length ?? 0} ideas loaded`);

  const hnIds = await fetchJson("https://hacker-news.firebaseio.com/v0/topstories.json");
  const firstHnId = hnIds[0];
  const hnItem = await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${firstHnId}.json`);
  console.log(`Hacker News: "${hnItem.title}"`);

  const rss = await fetchJson(
    "https://api.rss2json.com/v1/api.json?rss_url=https://techcrunch.com/feed/",
  );
  console.log(`TechCrunch RSS: ${rss.items?.length ?? 0} items returned`);

  try {
    const productHunt = await fetchJson(`${BASE_URL}/api/producthunt`);
    if (!productHunt.enabled) {
      console.log(
        "Product Hunt: disabled (set PH_TOKEN or PRODUCT_HUNT_TOKEN, or PH_CLIENT_ID + PH_CLIENT_SECRET, or PH_API_Key + PH_API_SECRET)",
      );
    } else if (productHunt.error) {
      console.log(`Product Hunt: auth/API error — ${productHunt.error}`);
      if (productHunt.upstreamStatus) {
        console.log(`  (upstream HTTP ${productHunt.upstreamStatus}, auth: ${productHunt.authSource ?? "?"})`);
      }
    } else {
      console.log(
        `Product Hunt: ${productHunt.posts?.length ?? 0} posts returned${productHunt.authSource ? ` (${productHunt.authSource})` : ""}`,
      );
    }
  } catch (error) {
    console.log(`Product Hunt: route check failed (${String(error)})`);
  }

  console.log("\nOverview source checks complete.");
}

run().catch((error) => {
  console.error("Overview source checks failed:", error);
  process.exit(1);
});
