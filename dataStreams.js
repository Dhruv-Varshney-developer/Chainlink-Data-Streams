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

function decodeChainlinkReport(fullReport) {
  try {
    const buffer = Buffer.from(fullReport.slice(2), "hex");

    // CORRECT positions based on actual data analysis:
    // Position 8: Feed ID (offset 256)
    const feedId = "0x" + buffer.slice(256, 288).toString("hex");

    // Position 9: validFromTimestamp (offset 288)
    const validFromTimestamp = buffer.readUInt32BE(284); // Last 4 bytes of the 32-byte slot

    // Position 10: observationsTimestamp (offset 320)
    const observationsTimestamp = buffer.readUInt32BE(316); // Last 4 bytes of the 32-byte slot

    // Position 14: Benchmark Price (offset 448)
    const priceBytes = buffer.slice(448, 480);
    const priceWei = BigInt("0x" + priceBytes.toString("hex"));
    const price = Number(priceWei) / 1e18;

    // Position 15: Bid (offset 480)
    const bidBytes = buffer.slice(480, 512);
    const bidWei = BigInt("0x" + bidBytes.toString("hex"));
    const bid = Number(bidWei) / 1e18;

    // Position 16: Ask (offset 512)
    const askBytes = buffer.slice(512, 544);
    const askWei = BigInt("0x" + askBytes.toString("hex"));
    const ask = Number(askWei) / 1e18;

    return {
      feedId,
      validFromTimestamp,
      observationsTimestamp,
      benchmarkPrice: price,
      bid,
      ask,
      rawReport: fullReport,
    };
  } catch (error) {
    console.error("Decode error:", error);
    return null;
  }
}

async function fetchReport(symbol, feedId) {
  const path = `/api/v1/reports/latest?feedID=${feedId}`;
  const headers = generateAuthHeaders("GET", path, API_KEY, API_SECRET);

  console.log(`\n🔍 Fetching ${symbol} report...`);
  console.log(`Feed ID: ${feedId}`);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const decodedReport = decodeChainlinkReport(data.report.fullReport);

    if (!decodedReport) {
      throw new Error("Failed to decode report");
    }

    console.log(`\n🔸 ${symbol} Report:`);
    console.log(`   Feed ID: ${decodedReport.feedId}`);
    console.log(
      `   Benchmark Price: $${decodedReport.benchmarkPrice.toLocaleString()}`
    );
    console.log(`   Bid: $${decodedReport.bid.toLocaleString()}`);
    console.log(`   Ask: $${decodedReport.ask.toLocaleString()}`);
    console.log(`   Timestamp: ${decodedReport.observationsTimestamp}`);

    return decodedReport;
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

  console.log("\n🔸 ETH/USD Summary:");
  console.log(`   Feed ID: ${ethReport.feedId}`);
  console.log(`   Price: $${ethReport.benchmarkPrice.toLocaleString()}`);
  console.log(`   Bid: $${ethReport.bid.toLocaleString()}`);
  console.log(`   Ask: $${ethReport.ask.toLocaleString()}`);
  console.log(`   Timestamp: ${ethReport.observationsTimestamp}`);

  console.log("\n🔸 BTC/USD Summary:");
  console.log(`   Feed ID: ${btcReport.feedId}`);
  console.log(`   Price: $${btcReport.benchmarkPrice.toLocaleString()}`);
  console.log(`   Bid: $${btcReport.bid.toLocaleString()}`);
  console.log(`   Ask: $${btcReport.ask.toLocaleString()}`);
  console.log(`   Timestamp: ${btcReport.observationsTimestamp}`);

  // Expected ranges
  const ethInExpectedRange =
    ethReport.benchmarkPrice >= 1500 && ethReport.benchmarkPrice <= 8000;
  const btcInExpectedRange =
    btcReport.benchmarkPrice >= 30000 && btcReport.benchmarkPrice <= 150000;

  console.log(`\n📈 PRICE RANGE ANALYSIS`);
  console.log(`ETH price in expected range (1500-8000): ${ethInExpectedRange}`);
  console.log(
    `BTC price in expected range (30000-150000): ${btcInExpectedRange}`
  );

  // Raw reports
  console.log(
    "\nETH/USD Raw Report:",
    JSON.stringify(
      {
        feedID: ethReport.feedId,
        timestamp: ethReport.observationsTimestamp,
        fullReport: ethReport.rawReport,
      },
      null,
      2
    )
  );

  console.log(
    "\nBTC/USD Raw Report:",
    JSON.stringify(
      {
        feedID: btcReport.feedId,
        timestamp: btcReport.observationsTimestamp,
        fullReport: btcReport.rawReport,
      },
      null,
      2
    )
  );
}

main().catch(console.error);
