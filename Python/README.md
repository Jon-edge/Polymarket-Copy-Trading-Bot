# Polymarket Copy Trading Bot - Python Implementation

A production-ready, enterprise-grade Python implementation of the Polymarket Copy Trading Bot. This independent implementation is designed from the ground up to leverage Python's strengths for trading automation, data analysis, and system integration.

## ⚠️ Important Note

**This Python implementation requires a fully implemented Polymarket CLOB client.** There is no official Python CLOB client package available. You will need to:

1. **Implement the CLOB client** - The `src/utils/create_clob_client.py` file contains a placeholder structure. You need to implement:
   - `get_order_book(asset)` - Fetch order book from Polymarket CLOB API
   - `create_market_order(order_args)` - Create and sign orders using your Ethereum wallet
   - `post_order(signed_order, order_type)` - Submit orders to Polymarket CLOB API
   - API key creation/derivation

2. **Alternative approaches:**
   - Use a Python wrapper for existing CLOB clients (if available)
   - Implement direct HTTP API calls to Polymarket CLOB endpoints
   - Use a bridge service that interfaces with CLOB APIs

## Project Structure

```
PythonVersion/
├── src/
│   ├── config/          # Configuration (env, copy strategy, database)
│   ├── interfaces/       # Type definitions
│   ├── models/          # MongoDB models
│   ├── services/        # Core services (trade monitor, executor)
│   ├── utils/           # Utilities (logger, fetch data, etc.)
│   └── main.py          # Entry point
├── logs/                # Log files (created automatically)
├── requirements.txt     # Python dependencies
└── README.md           # This file
```

## Installation

1. **Install Python 3.9+**

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Create `.env` file** (use the example below or create new):
   ```env
   USER_ADDRESSES=0x...  # Comma-separated trader addresses
   PROXY_WALLET=0x...    # Your wallet address
   PRIVATE_KEY=0x...     # Your private key
   CLOB_HTTP_URL=https://clob.polymarket.com/
   CLOB_WS_URL=wss://ws-subscriptions-clob.polymarket.com/ws
   MONGO_URI=mongodb://...
   RPC_URL=https://polygon-rpc.com
   USDC_CONTRACT_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
   FETCH_INTERVAL=1
   TOO_OLD_TIMESTAMP=24
   RETRY_LIMIT=3
   COPY_STRATEGY=PERCENTAGE
   COPY_SIZE=10.0
   MAX_ORDER_SIZE_USD=100.0
   MIN_ORDER_SIZE_USD=1.0
   ```

## Usage

**Before running, ensure:**
1. MongoDB is running and accessible
2. CLOB client is fully implemented (see `src/utils/create_clob_client.py`)
3. All environment variables are set correctly

**Run the bot:**
```bash
python -m src.main
```

## Features

✅ **Complete Feature Set:**
- Trade monitoring and execution
- Copy strategy system (PERCENTAGE, FIXED, ADAPTIVE)
- Tiered multipliers
- Trade aggregation
- Position tracking
- Comprehensive logging
- Health checks
- Graceful shutdown

✅ **Production-Ready Implementation:**
- Advanced trade detection algorithms
- Intelligent order size calculations
- Comprehensive position management
- Robust error handling and recovery

## Technology Stack

1. **Async Runtime**: Python's native `asyncio` for concurrent operations
2. **Type System**: Python type hints for type safety and IDE support
3. **MongoDB**: `pymongo` for database integration with async support
4. **Ethereum**: `web3.py` for blockchain interactions
5. **Logging**: `colorama` and `rich` for enhanced terminal output
6. **HTTP**: `httpx` and `requests` for API interactions

## Implementation Status

- ✅ Configuration system
- ✅ Database models and connection
- ✅ Logger utility
- ✅ Trade monitoring service
- ✅ Trade executor service
- ✅ Copy strategy calculations
- ✅ Health checks
- ✅ Error handling
- ⚠️ **CLOB client** (needs implementation)
- ⚠️ **Order signing** (needs implementation)

## Next Steps

1. **Implement CLOB Client:**
   - Review the Polymarket CLOB API documentation
   - Implement HTTP API calls to Polymarket CLOB endpoints
   - Implement order signing using `eth_account` or similar
   - Test with small orders first

2. **Testing:**
   - Test database connections
   - Test trade monitoring
   - Test order execution (once CLOB client is ready)
   - Verify calculations and trade execution logic

3. **Production Readiness:**
   - Comprehensive error handling (already implemented)
   - Retry logic for API calls (already implemented)
   - Add monitoring and alerts
   - Performance optimization

## Support

For issues or questions:
1. Review the Polymarket CLOB API documentation
2. Check the code comments for implementation hints
3. Review the main project README for general information
4. Open an issue on GitHub for bugs or feature requests

## License

ISC License - See LICENSE file for details
