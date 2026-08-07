import jwt from "jsonwebtoken";
import { HttpError } from "../middleware/error";

type TokenKind = "access" | "refresh";

const TTL: Record<TokenKind, string> = { access: "15m", refresh: "30d" };

function secret(kind: TokenKind): string {
  const s = kind === "access" ? process.env.JWT_SECRET : process.env.JWT_REFRESH_SECRET;
  if (!s) throw new Error(`JWT secret for ${kind} token is not configured`);
  return s;
}

export function signTokens(userId: string) {
  const sign = (kind: TokenKind) =>
    jwt.sign({}, secret(kind), { subject: userId, expiresIn: TTL[kind] as jwt.SignOptions["expiresIn"] });
  return { accessToken: sign("access"), refreshToken: sign("refresh") };
}

export function verifyToken(token: string, kind: TokenKind): string {
  try {
    const payload = jwt.verify(token, secret(kind));
    if (typeof payload === "string" || !payload.sub) throw new Error("no subject");
    return payload.sub;
  } catch {
    throw new HttpError(401, "টোকেন সঠিক নয় বা মেয়াদ শেষ হয়ে গেছে");
  }
}
