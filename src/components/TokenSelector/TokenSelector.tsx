import { useState, useEffect } from "react";
import { useWallet } from "@suiet/wallet-kit";
import { useWalletContext } from "../../contexts/WalletContext";
import { useBirdeye } from "../../contexts/BirdeyeContext";
import "./TokenSelector.scss";

interface TokenData {
  address: string;
  symbol: string;
  name: string;
  logo: string;
  decimals: number;
  price: number;
  balance?: number; // user’s balance, if in portfolio
  change24h?: number; // 24h price change
  isTrending?: boolean; // indicates trending token
}

// Example pinned tokens, adapt as needed:
const PINNED_TOKENS: TokenData[] = [
  {
    address: "0x2::sui::SUI",
    symbol: "SUI",
    name: "Sui",
    logo: "https://assets.coingecko.com/coins/images/24405/large/sui.jpeg",
    decimals: 9,
    price: 0,
  },
  {
    address:
      "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
    symbol: "USDC",
    name: "USD Coin",
    logo: "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png",
    decimals: 6,
    price: 0,
  },
  // Add more pinned tokens here if desired
];

interface TokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: TokenData) => void;
  excludeAddresses?: string[];
}

const TokenSelector = ({
  isOpen,
  onClose,
  onSelect,
  excludeAddresses = [],
}: TokenSelectorProps) => {
  const { account } = useWallet();

  // Pull data from BirdeyeContext
  const {
    trendingTokens,
    tokenList,
    isLoadingTrending,
    isLoadingTokenList,
    refreshTrendingTokens,
    refreshTokenList,
  } = useBirdeye();

  // Pull data from WalletContext
  const { walletState, coinPrices, tokenMetadata, formatUsd, refreshBalances } =
    useWalletContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "portfolio" | "trending">(
    "all"
  );

  // Refresh data (Birdeye + wallet) each time the modal is opened
  useEffect(() => {
    if (isOpen) {
      refreshTrendingTokens();
      refreshTokenList();
      refreshBalances();
    }
  }, [isOpen, account?.address]);

  // Convert the user's balances (walletState) to the same TokenData shape
  const getWalletTokens = (): TokenData[] => {
    if (!walletState.balances || walletState.balances.length === 0) return [];

    return walletState.balances
      .filter((bal) => !excludeAddresses.includes(bal.coinType))
      .map((bal) => {
        const metadata = tokenMetadata[bal.coinType] || {};
        const price = coinPrices[bal.coinType] || 0; // If we have a price
        const balanceValue = Number(bal.balance) / Math.pow(10, bal.decimals);
        // If 24h price change is stored in metadata, use it, else 0
        const change24h = metadata.priceChange24h
          ? Number(metadata.priceChange24h)
          : 0;

        return {
          address: bal.coinType,
          symbol: bal.symbol || metadata.symbol || "UNKNOWN",
          name: bal.name || metadata.name || "Unknown Token",
          logo: metadata.logo || "",
          decimals: bal.decimals,
          price,
          balance: balanceValue, // user’s portfolio balance
          change24h,
        };
      });
  };

  // Combine pinned tokens with the Birdeye tokenList
  const getAllTokens = (): TokenData[] => {
    // Filter out excluded
    const validTokenList = tokenList.filter(
      (t: TokenData) => !excludeAddresses.includes(t.address)
    );

    // Convert addresses to lowercase for easy dedup
    const existingAddr = new Set(
      validTokenList.map((t: TokenData) => t.address.toLowerCase())
    );

    // Filter pinned if they appear in the tokenList
    const filteredPinned = PINNED_TOKENS.filter(
      (pt) => !existingAddr.has(pt.address.toLowerCase())
    );

    // Return pinned first, then the public token list
    return [...filteredPinned, ...validTokenList];
  };

  // Depending on the active tab, pick the list
  const filteredTokens = () => {
    const query = searchQuery.toLowerCase().trim();
    let list: TokenData[] = [];

    if (activeTab === "portfolio") {
      list = getWalletTokens();
    } else if (activeTab === "trending") {
      list = trendingTokens;
    } else {
      // "all" tab
      list = getAllTokens();
    }

    // Filter by search query
    if (query) {
      return list.filter(
        (token) =>
          token.symbol.toLowerCase().includes(query) ||
          token.name.toLowerCase().includes(query) ||
          token.address.toLowerCase().includes(query)
      );
    }
    return list;
  };

  // Overall loading state from contexts
  const isLoading =
    isLoadingTrending || isLoadingTokenList || walletState.loading;

  if (!isOpen) return null;

  return (
    <div className="token-selector-modal">
      <div className="token-selector-content">
        <div className="token-selector-header">
          <h2>Select Token</h2>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="token-search">
          <input
            type="text"
            placeholder="Search by name or address"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="token-tabs">
          <button
            className={activeTab === "all" ? "active" : ""}
            onClick={() => setActiveTab("all")}
          >
            All Tokens
          </button>
          {account && (
            <button
              className={activeTab === "portfolio" ? "active" : ""}
              onClick={() => setActiveTab("portfolio")}
            >
              Your Tokens
            </button>
          )}
          <button
            className={activeTab === "trending" ? "active" : ""}
            onClick={() => setActiveTab("trending")}
          >
            Trending
          </button>
        </div>

        <div className="token-list">
          {isLoading ? (
            <div className="loading">Loading tokens...</div>
          ) : filteredTokens().length === 0 ? (
            <div className="no-tokens">No tokens found</div>
          ) : (
            filteredTokens().map((token) => (
              <div
                key={token.address}
                className="token-item"
                onClick={() => onSelect(token)}
              >
                <div className="token-info">
                  {token.logo && (
                    <img
                      src={token.logo}
                      alt={token.symbol}
                      className="token-logo"
                    />
                  )}
                  <div className="token-details">
                    <div className="token-symbol">
                      {token.symbol}
                      {token.isTrending && (
                        <span className="trending-badge">🔥</span>
                      )}
                    </div>
                    <div className="token-name">{token.name}</div>
                  </div>
                </div>
                <div className="token-data">
                  {token.balance !== undefined && (
                    <div className="token-balance">
                      {token.balance.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}
                    </div>
                  )}
                  <div className="token-price">
                    {formatUsd(token.price)}
                    {token.change24h !== undefined && (
                      <span
                        className={`price-change ${
                          token.change24h >= 0 ? "positive" : "negative"
                        }`}
                      >
                        {token.change24h >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(token.change24h).toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenSelector;
