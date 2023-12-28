import { Network, QuotePriceData } from "./types";
import { createLogger, format, transports } from "winston";

export function strip_leading_zeros(hex: string) {
  return "0x" + hex.replace(/^(0x)0*/, "");
}

export function getTxUrl(txHash: string, network: Network) {
  if (network == Network.Goerli) {
    return `https://goerli.voyager.online/tx/${txHash}`;
  }
  return `https://voyager.online/tx/${txHash}`;
}

export function toEther(amount: bigint) {
  return parseFloat(amount.toString()) / 1e18;
}

// Configure Winston logger
export const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: "telegram-buy-alerts" },
  transports: [
    new transports.File({ filename: "error.log", level: "error" }),
    new transports.File({ filename: "combined.log" }),
  ],
});

export async function getETHPriceInUSD(): Promise<number> {
  try {
    const response = await fetch(
      "https://api.coinbase.com/v2/exchange-rates?currency=ETH"
    );
    const responseData = (await response.json()) as QuotePriceData;
    return parseInt(responseData.data.rates.USD);
  } catch {
    return NaN;
  }
}