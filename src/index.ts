import { BlockTag, RpcProvider } from "starknet";
import { CallWithCalldata, ParsedTransaction } from "./utils/types";
import { getETHPriceInUSD, toEther } from "./utils/utils";
import { format, transports } from "winston";
import { ContractToAddresses, SELECTORS } from "./utils/constants";
import { logger } from "./utils/utils";
import cron from "node-cron";
import { parseTransactionCalldata } from "./utils/decoder";
import TelegramBot from "node-telegram-bot-api";

const telegramToken = process.env.TELEGRAM_BOT_TOKEN!;
export const bot = new TelegramBot(telegramToken, { polling: true });

logger.add(
  new transports.Console({
    format: format.simple(),
  })
);

const MAINNET_URL = process.env.RPC_URL!;
const rpcProvider = new RpcProvider({
  nodeUrl: MAINNET_URL,
  headers: {
    "Content-Type": "application/json",
    "x-apikey": process.env.RPC_API_KEY,
  },
});

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const TOKEN_NAME = process.env.TOKEN_NAME!;
const TOKEN_POOL = process.env.TOKEN_POOL!;
const TOKEN_FROM = process.env.TOKEN_FROM!;
const TOTAL_SUPPLY = process.env.TOTAL_SUPPLY!;
const swapLink = `<a href="https://app.avnu.fi/en?tokenFrom=${TOKEN_FROM}&tokenTo=${TOKEN_ADDRESS}&amount=0.001">Swap</a>`;
const poolLink = `<a href="https://www.geckoterminal.com/en/starknet-alpha/pools/${TOKEN_POOL}"> Chart </a>`;

function numberWithCommas(x: number) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export async function inspectBlockBuys(block: Block, token: bigint) {
  const txInfos = await parseTransactionCalldata(block.transactions);
  for (const tx of txInfos) {
    const txsBuy = await filterBuyCoin(tx, token);
    for (const tx of txsBuy) {
      logger.info("Swapped: %o", {
        amountIn: toEther(tx.amountIn),
        amountOut: toEther(tx.amountOut),
      });
      const dexString =
        tx.dex === "Avnu.fi"
          ? `<a href="https://app.avnu.fi/en?tokenFrom=0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7&tokenTo=0x06cead2351c6fc93ccf3a43d4ddb645d0c851c1827b0332e3ac0c5c89d6560db&amount=0.001">Avnu.fi</a>`
          : `<a href="https://app.jediswap.xyz/#/swap"> Jediswap </a>`;
      const msgString = `
<b>${TOKEN_NAME} Buy!</b>
🟢
<b>Spent</b>: ${toEther(tx.amountIn)} ETH
<b>Got</b>: ${toEther(tx.amountOut).toFixed(2)} ${TOKEN_NAME}
<b>DEX</b>: ${dexString}
<b>Price</b>: $${tx.price.toFixed(13)} ETH
<b>MarketCap</b>: $${numberWithCommas(tx.marketCap)}
<a href="https://voyager.online/tx/${
        tx.hash
      }">TX</a> | ${swapLink} | ${poolLink}
      `;
      await bot.sendMessage(TELEGRAM_CHAT_ID, msgString, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    }
  }
}

type Block = {
  status: string;
  block_hash: string;
  parent_hash: string;
  block_number: string;
  new_root: string;
  timestamp: string;
  sequencer_address: string;
  l1_gas_price: string;
  starknet_version: string;
  transactions: string[];
};

type Swap = {
  tokenIn: bigint;
  tokenOut: bigint;
  amountIn: bigint;
  amountOut: bigint;
  hash: string;
  price: number;
  marketCap: number;
  dex: String;
};

function getAvnuBuys(call: CallWithCalldata, txHash: string): Swap | undefined {
  if (
    BigInt(call.contractAddress) == BigInt(ContractToAddresses.AVNU_ROUTER) &&
    BigInt(call.entrypoint) == BigInt(SELECTORS.multi_route_swap)
  ) {
    let tokenFrom = call.calldata[0];
    let amountFrom = call.calldata[1];
    let tokenTo = call.calldata[3];
    let amountTo = call.calldata[4];
    let price =
      parseFloat(BigInt(amountFrom).toString()) /
      parseFloat(BigInt(amountTo).toString());
    let marketCap = Math.floor(
      parseInt(TOTAL_SUPPLY) * 10 ** -18 * price * ethPrice
    );

    if (
      BigInt(tokenFrom) == BigInt(TOKEN_FROM) &&
      BigInt(tokenTo) == BigInt(TOKEN_ADDRESS)
    ) {
      return {
        tokenIn: BigInt(tokenFrom),
        tokenOut: BigInt(tokenTo),
        amountIn: BigInt(amountFrom),
        amountOut: BigInt(amountTo),
        price,
        marketCap,
        hash: txHash,
        dex: "Avnu.fi",
      };
    }
  }
}

function getJediswapBuys(
  call: CallWithCalldata,
  txHash: string
): Swap | undefined {
  if (
    BigInt(call.contractAddress) == BigInt(ContractToAddresses.JEDI_ROUTER) &&
    BigInt(call.entrypoint) == BigInt(SELECTORS.swap_exact_tokens_for_tokens)
  ) {
    let amountFrom = call.calldata[0];
    let amountTo = call.calldata[2];
    let tokenFrom = call.calldata[5];
    let tokenTo = call.calldata[6];
    let price =
      parseFloat(BigInt(amountFrom).toString()) /
      parseFloat(BigInt(amountTo).toString());
    let marketCap = Math.floor(
      parseInt(TOTAL_SUPPLY) * 10 ** -18 * price * ethPrice
    );

    if (
      BigInt(tokenFrom) == BigInt(TOKEN_FROM) &&
      BigInt(tokenTo) == BigInt(TOKEN_ADDRESS)
    ) {
      return {
        tokenIn: BigInt(tokenFrom),
        tokenOut: BigInt(tokenTo),
        amountIn: BigInt(amountFrom),
        amountOut: BigInt(amountTo),
        price,
        marketCap,
        hash: txHash,
        dex: "Jediswap",
      };
    }
  }
}

function filterBuyCoin(parsedTx: ParsedTransaction, token: BigInt) {
  let buyDetails: Swap[] | undefined = parsedTx.calls.flatMap((call) => {
    let avnuBuys = getAvnuBuys(call, parsedTx.hash);
    let jediswapBuys = getJediswapBuys(call, parsedTx.hash);
    if (avnuBuys) {
      return avnuBuys;
    }
    if (jediswapBuys) {
      return jediswapBuys;
    }

    return [];
  });
  return buyDetails;
}

let processedBlock = 0;
let ethPrice = 0;

async function main() {
  let latestBlock = (await rpcProvider.getBlockWithTxs(
    BlockTag.latest
  )) as unknown as Block;
  let newprocessedBlock = parseInt(latestBlock.block_number);
  if (processedBlock == newprocessedBlock) {
    return;
  } else {
    processedBlock = newprocessedBlock;
  }
  ethPrice = await getETHPriceInUSD();
  await inspectBlockBuys(latestBlock, BigInt(TOKEN_ADDRESS));
}

cron.schedule("*/1 * * * * *", main);
logger.info("Telegram bot started");
main();
