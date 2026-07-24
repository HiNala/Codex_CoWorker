import { getDevSession } from "@forge/auth";
import type { SessionProvider } from "@forge/contracts";
import { getFlags } from "@forge/config";

const realSession: SessionProvider = async () => null;

export const getSession: SessionProvider = async (request) => {
  return getFlags().auth === "dev" ? getDevSession(request) : realSession(request);
};
