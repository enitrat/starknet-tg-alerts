import { Call } from "starknet";
import { ParsedTransaction } from "./types";

/**
 * Reconstructs the list of calls from the flattened calldata.
 * @param rawCalldata
 * @returns
 */
export const toCallsFromExecuteCalldata = (rawCalldata: string[]): Call[] => {
  const callArrayLength = parseInt(rawCalldata[0]);
  const calls: Call[] = [];

  const isOldFormat = isCairoZeroTx(rawCalldata);

  let i = 1;
  if (!isOldFormat) {
    const headerSize = 3;
    let maxSize = callArrayLength * headerSize;

    while (i <= maxSize) {
      //Offsets
      const contractAddressOffset = i;
      const entryPointOffset = i + 1;
      const dataLenOffset = i + 2;
      const dataOffset = i + 3;

      const dataLen = rawCalldata[dataLenOffset];
      const data = rawCalldata.slice(
        dataOffset,
        dataOffset + parseInt(dataLen)
      );

      calls.push({
        contractAddress: rawCalldata[contractAddressOffset],
        entrypoint: rawCalldata[entryPointOffset],
        calldata: data,
      });
      maxSize += parseInt(dataLen);
      i += headerSize + parseInt(dataLen);
    }
  } else {
    const headerSize = 4;
    const calldataLenOffset = callArrayLength * headerSize + 1;
    const dataSize = parseInt(rawCalldata[calldataLenOffset]);

    while (i <= callArrayLength * headerSize) {
      const contractAddressOffset = i;
      const entryPointOffset = i + 1;
      const dataOffsetOffset = i + 2;
      const dataLenOffset = i + 3;

      const dataLen = rawCalldata[dataLenOffset];
      const dataOffset = parseInt(rawCalldata[dataOffsetOffset]) + 1;
      const data = rawCalldata.slice(
        calldataLenOffset + dataOffset,
        calldataLenOffset + dataOffset + parseInt(dataLen)
      );
      let call = {
        contractAddress: rawCalldata[contractAddressOffset],
        entrypoint: rawCalldata[entryPointOffset],
        calldata: data,
      };
      calls.push(call);
      i += headerSize;
    }
  }

  return calls;
};

export const isCairoZeroTx = (flattenedData: string[]): boolean => {
  return BigInt(flattenedData[3]) === BigInt("0x0");
};

export const parseTransactionCalldata = (
  transactions: any
): ParsedTransaction[] => {
  const decodedCalldatas = transactions.flatMap((tx: any) => {
    if (tx.type !== "INVOKE" && tx.type !== "INVOKE_FUNCTION") {
      return [];
    }
    return {
      calls: toCallsFromExecuteCalldata(tx.calldata),
      hash: tx.transaction_hash,
    };
  });

  return decodedCalldatas;
};
