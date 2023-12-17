import { strip_leading_zeros } from "./utils";

export const JEDI_ROUTER = strip_leading_zeros(
  "0x041fd22b238fa21cfcf5dd45a8548974d8263b3a531a60388411c5e230f97023"
);
export const AVNU_ROUTER = strip_leading_zeros(
  "0x04270219d365d6b017231b52e92b3fb5d7c8378b05e9abc97724537a80e93b0f"
);
export const ContractToAddresses = {
  JEDI_ROUTER: BigInt(JEDI_ROUTER),
  AVNU_ROUTER: BigInt(AVNU_ROUTER),
};

export const SELECTORS = {
  multi_route_swap: BigInt(
    "0x01171593aa5bdadda4d6b0efde6cc94ee7649c3163d5efeb19da6c16d63a2a63"
  ),
  swap_exact_tokens_for_tokens: BigInt(
    "0x03276861cf5e05d6daf8f352cabb47df623eb10c383ab742fcc7abea94d5c5cc"
  ),
};
