// Run with: STREAMS_API_KEY=your_key STREAMS_API_SECRET=your_secret node dataStreams.js

const crypto = require("crypto");

const API_KEY = process.env.STREAMS_API_KEY;
const API_SECRET = process.env.STREAMS_API_SECRET;
const BASE_URL = "https://api.testnet-dataengine.chain.link";

// Feed IDs from Chainlink documentation
const FEED_IDS = {
  "ETH/USD":
    "0x000359843a543ee2fe414dc14c7e7920ef10f4372990b79d6361cdc0dd1ba782",
  "BTC/USD":
    "0x00037da06d56d083fe599397a4769a042d63aa73dc4ef57709d31e9971a5b439",
};

function generateAuthHeaders(method, path, apiKey, apiSecret) {
  const timestamp = Date.now();
  const bodyHash = crypto.createHash("sha256").update("").digest("hex");
  const stringToSign = `${method} ${path} ${bodyHash} ${apiKey} ${timestamp}`;
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(stringToSign)
    .digest("hex");

  return {
    Authorization: apiKey,
    "X-Authorization-Timestamp": timestamp.toString(),
    "X-Authorization-Signature-SHA256": signature,
  };
}

function extractPrice(fullReport) {
  try {
    const buffer = Buffer.from(fullReport.slice(2), "hex");
    if (buffer.length >= 64) {
      const priceHex = buffer.slice(32, 64).toString("hex");
      const priceWei = BigInt("0x" + priceHex);
      return Number(priceWei) / 1e2;
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

async function fetchReport(symbol, feedId) {
  const path = `/api/v1/reports/latest?feedID=${feedId}`;
  const headers = generateAuthHeaders("GET", path, API_KEY, API_SECRET);

  console.log(`\n🔍 Fetching ${symbol} report...`);
  console.log(`Feed ID: ${feedId}`);
  console.log(`URL: ${BASE_URL}${path}`);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const extractedPrice = extractPrice(data.report.fullReport);

    return {
      symbol,
      feedId,
      requestedFeedId: feedId,
      returnedFeedId: data.report.feedID,
      extractedPrice,
      timestamp: data.report.observationsTimestamp,
      reportPrefix: data.report.fullReport.substring(0, 100),
      fullReport: data.report.fullReport,
    };
  } catch (error) {
    console.error(`❌ Error fetching ${symbol}:`, error.message);
    return null;
  }
}

async function main() {

  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Base URL: ${BASE_URL}`);

  if (!API_KEY || !API_SECRET) {
    console.error(
      "❌ Missing API credentials. Set STREAMS_API_KEY and STREAMS_API_SECRET environment variables."
    );
    process.exit(1);
  }

  // Fetch both reports
  const ethReport = await fetchReport("ETH/USD", FEED_IDS["ETH/USD"]);
  const btcReport = await fetchReport("BTC/USD", FEED_IDS["BTC/USD"]);

  if (!ethReport || !btcReport) {
    console.error("❌ Failed to fetch one or both reports");
    process.exit(1);
  }

  console.log("\n📊 RESULTS COMPARISON");
  console.log("=====================");

  console.log("\n🔸 ETH/USD Report:");
  console.log(`   Feed ID: ${ethReport.returnedFeedId}`);
  console.log(`   Price: $${ethReport.extractedPrice.toLocaleString()}`);
  console.log(`   Timestamp: ${ethReport.timestamp}`);
  console.log(`   Report Prefix: ${ethReport.reportPrefix}...`);

  console.log("\n🔸 BTC/USD Report:");
  console.log(`   Feed ID: ${btcReport.returnedFeedId}`);
  console.log(`   Price: $${btcReport.extractedPrice.toLocaleString()}`);
  console.log(`   Timestamp: ${btcReport.timestamp}`);
  console.log(`   Report Prefix: ${btcReport.reportPrefix}...`);

 

  // Expected ranges
  const ethInExpectedRange =
    ethReport.extractedPrice >= 1500 && ethReport.extractedPrice <= 8000;
  const btcInExpectedRange =
    btcReport.extractedPrice >= 30000 && btcReport.extractedPrice <= 150000;

  console.log(`\n📈 PRICE RANGE ANALYSIS`);
  console.log(`ETH price in expected range (1500-8000): ${ethInExpectedRange}`);
  console.log(
    `BTC price in expected range (30000-150000): ${btcInExpectedRange}`
  );

  
  console.log(
    "ETH/USD Raw Report:",
    JSON.stringify(
      {
        feedID: ethReport.returnedFeedId,
        timestamp: ethReport.timestamp,
        fullReport: ethReport.fullReport.substring(0, 200) + "...",
      },
      null,
      2
    )
  );

  console.log(
    "\nBTC/USD Raw Report:",
    JSON.stringify(
      {
        feedID: btcReport.returnedFeedId,
        timestamp: btcReport.timestamp,
        fullReport: btcReport.fullReport.substring(0, 200) + "...",
      },
      null,
      2
    )
  );
}

main().catch(console.error);
