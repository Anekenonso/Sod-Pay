import { Sod, CreateSodInput } from "../sod";
import { ClientMode } from "./logger";

export interface TariSodClient {
  readonly mode: ClientMode;
  createSod(
    input: CreateSodInput,
    signerAddress: string
  ): Promise<{ sod: Sod; claimBadgeId: string; txId: string }>;
  paySod(
    sodId: string,
    amount: string,
    payerAddress: string
  ): Promise<{ sod: Sod; txId: string }>;
  claimSod(
    sodId: string,
    claimantAddress: string
  ): Promise<{ sod: Sod; txId: string }>;
  cancelSod(
    sodId: string,
    callerAddress: string
  ): Promise<{ sod: Sod; txId: string }>;
  requestReveal(
    sodId: string,
    callerAddress: string
  ): Promise<{ sod: Sod; txId: string }>;
  approveReveal(
    sodId: string,
    callerAddress: string
  ): Promise<{ sod: Sod; txId: string }>;
  getSod(sodId: string): Promise<Sod | null>;
  listSodsByCreator(creatorAddress: string): Promise<Sod[]>;
  listSodsByPayer?(payerAddress: string): Promise<Sod[]>;
  getAccountPublicKey?(accountAddress: string): Promise<string | null>;
  getCurrentEpoch?(): Promise<number | null>;
  userHoldsClaimBadge(sodId: string, userAddress: string): Promise<boolean>;
}
