import type { Session, SessionProvider } from "@forge/contracts";

export const DEV_SESSION: Session = {
  userId: "0198206f-5f53-7000-8000-000000000002",
  orgId: "0198206f-5f53-7000-8000-000000000001",
  email: "demo@forge.dev",
  role: "owner",
  displayName: "Demo Owner",
};

export const getDevSession: SessionProvider = async (request) => {
  void request;
  return DEV_SESSION;
};
