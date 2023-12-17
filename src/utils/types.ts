import { Call } from "starknet";

export enum Network {
  Mainnet = "MAINNET",
  Goerli = "GOERLI",
}

export type CallWithCalldata = Call & {
  calldata: string[];
};

export type ParsedTransaction = CallWithCalldata & {
  calls: CallWithCalldata[];
  hash: string;
};

