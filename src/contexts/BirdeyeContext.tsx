import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { birdeyeService } from "../services/birdeyeService";

// Define the token data interface
interface TokenData {
  address: string;
  symbol: string;
  name: string;
  logo: string;
  decimals: number;
  price: number;
  balance?: number;
  change24h?: number;
  isTrending?: boolean;
}

interface BirdeyeContextType {
  trendingTokens: TokenData[]; // Update type from any[] to TokenData[]
  tokenList: TokenData[]; // Update type from any[] to TokenData[]
  isLoadingTrending: boolean;
  isLoadingTokenList: boolean;
  refreshTrendingTokens: () => Promise<void>;
  refreshTokenList: () => Promise<void>;
  getTokenMetadata: (tokenAddress: string) => Promise<any>;
  getWalletTokens: (address: string) => Promise<TokenData[]>; // Update return type
  getTokenChart: (
    tokenAddress: string,
    resolution?: string,
    count?: number
  ) => Promise<any>;
}

const BirdeyeContext = createContext<BirdeyeContextType | undefined>(undefined);

export const BirdeyeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [trendingTokens, setTrendingTokens] = useState<TokenData[]>([]);
  const [tokenList, setTokenList] = useState<TokenData[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState<boolean>(false);
  const [isLoadingTokenList, setIsLoadingTokenList] = useState<boolean>(false);

  // Helper to extract arrays from various response shapes
  const extractArray = (data: any): any[] => {
    if (!data) return [];
    if (data.data && Array.isArray(data.data)) return data.data;
    if (Array.isArray(data)) return data;
    if (data.tokens && Array.isArray(data.tokens)) return data.tokens;
    return [];
  };

  // Fetch trending tokens with proper formatting
  const refreshTrendingTokens = async () => {
    setIsLoadingTrending(true);
    try {
      const response = await birdeyeService.getTrendingTokens();
      if (response && response.data) {
        const trendingArr = extractArray(response.data);
        const formattedTokens = trendingArr.map((token: any) => ({
          address: token.address,
          symbol: token.symbol || "Unknown",
          name: token.name || "Unknown Token",
          logo: token.logo || "",
          decimals: token.decimals || 9,
          price: token.price || 0,
          change24h: token.priceChange24h || 0,
          isTrending: true,
        }));
        setTrendingTokens(formattedTokens);
      }
    } catch (error) {
      console.error("Error fetching trending tokens:", error);
    } finally {
      setIsLoadingTrending(false);
    }
  };

  // Fetch token list with proper formatting
  const refreshTokenList = async () => {
    setIsLoadingTokenList(true);
    try {
      const response = await birdeyeService.getTokenList();
      if (response && response.data) {
        const tokenListArr = extractArray(response.data);
        const formattedTokens = tokenListArr.map((token: any) => ({
          address: token.address,
          symbol: token.symbol || "Unknown",
          name: token.name || "Unknown Token",
          logo: token.logo || "",
          decimals: token.decimals || 9,
          price: token.price || 0,
          change24h: token.priceChange24h || 0,
        }));
        setTokenList(formattedTokens);
      }
    } catch (error) {
      console.error("Error fetching token list:", error);
    } finally {
      setIsLoadingTokenList(false);
    }
  };

  // Get token metadata
  const getTokenMetadata = async (tokenAddress: string) => {
    try {
      const response = await birdeyeService.getSingleTokenMetadata(
        tokenAddress
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching token metadata:", error);
      return null;
    }
  };

  // Get wallet tokens with proper formatting
  const getWalletTokens = async (address: string): Promise<TokenData[]> => {
    try {
      const response = await birdeyeService.getWalletTokenList(address);
      const walletArr = extractArray(response.data || []);
      return walletArr.map((token: any) => ({
        address: token.coinType || token.address,
        symbol:
          token.symbol ||
          (token.coinType ? token.coinType.split("::").pop() : "Unknown"),
        name: token.name || "Unknown Token",
        logo: token.logo || "",
        decimals: token.decimals || 9,
        price: token.price || 0,
        balance: parseFloat(token.balance) / Math.pow(10, token.decimals || 9),
        change24h: token.priceChange24h || 0,
      }));
    } catch (error) {
      console.error("Error fetching wallet tokens:", error);
      return [];
    }
  };

  // Get token chart data
  const getTokenChart = async (
    tokenAddress: string,
    resolution = "1d",
    count = 100
  ) => {
    try {
      const response = await birdeyeService.getChartData(
        tokenAddress,
        resolution,
        count
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching chart data:", error);
      return [];
    }
  };

  // Load initial data
  useEffect(() => {
    refreshTrendingTokens();
    refreshTokenList();
  }, []);

  return (
    <BirdeyeContext.Provider
      value={{
        trendingTokens,
        tokenList,
        isLoadingTrending,
        isLoadingTokenList,
        refreshTrendingTokens,
        refreshTokenList,
        getTokenMetadata,
        getWalletTokens,
        getTokenChart,
      }}
    >
      {children}
    </BirdeyeContext.Provider>
  );
};

export const useBirdeye = () => {
  const context = useContext(BirdeyeContext);
  if (context === undefined) {
    throw new Error("useBirdeye must be used within a BirdeyeProvider");
  }
  return context;
};
