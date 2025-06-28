# Chainlink Data Streams Testnet Bug Report

## Issue Summary
Both ETH/USD and BTC/USD feeds on Chainlink Data Streams testnet are returning identical data, indicating they point to the same underlying data source.

## Problem Details
- **ETH/USD Feed ID**: `0x000359843a543ee2fe414dc14c7e7920ef10f4372990b79d6361cdc0dd1ba782`
- **BTC/USD Feed ID**: `0x00037da06d56d083fe599397a4769a042d63aa73dc4ef57709d31e9971a5b439`
- **Issue**: Both feeds return the same price ($111,881.71) and identical report data
- **Expected**: ETH should return ~$2,600-$3,500, BTC should return ~$30,000-$150,000

## Evidence

### Test Results
```
🔸 ETH/USD Report:
   Feed ID: 0x000359843a543ee2fe414dc14c7e7920ef10f4372990b79d6361cdc0dd1ba782
   Price: $111,881.71
   Timestamp: 1751080547
   Report Prefix: 0x00090d9e8d96765a0c49e03a6ae05c82e8f8de70cf179baa632f18313e54bd690000000000000000000000000000000000...

🔸 BTC/USD Report:
   Feed ID: 0x00037da06d56d083fe599397a4769a042d63aa73dc4ef57709d31e9971a5b439
   Price: $111,881.71
   Timestamp: 1751080547
   Report Prefix: 0x00090d9e8d96765a0c49e03a6ae05c82e8f8de70cf179baa632f18313e54bd690000000000000000000000000000000000...
```

### Bug Analysis
- ✅ Feed IDs are correct (different IDs returned as requested)
- 🚨 Same price returned: true (111881.71 vs 111881.71)
- 🚨 Same report data: true
- 🚨 Same timestamp: true
- 🚨 ETH price in expected range (1500-8000): false
- ✅ BTC price in expected range (30000-150000): true

## Conclusion
Both feeds are returning identical data when they should return different prices. This suggests a testnet configuration issue where both feeds point to the same data source.

## Raw Data
Both feeds return identical report data:
```
0x00090d9e8d96765a0c49e03a6ae05c82e8f8de70cf179baa632f18313e54bd690000000000000000000000000000000000000000000000000000000000aab7cb0000000000000000000000000000000000000000000000000000000300000001000000...
```

## Reproduction
Run the provided `dataStreams.js` script with valid API credentials to reproduce this issue.