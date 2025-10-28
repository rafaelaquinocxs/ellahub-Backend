import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import jwt from "jsonwebtoken";
import * as db from "../db";
import { parse as parseCookieHeader } from "cookie";

const JWT_SECRET = process.env.JWT_SECRET || "datapay-secret-key-change-in-production";
const CUSTOM_AUTH_COOKIE = "datapay_auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  empresa: any | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let empresa: any | null = null;

  try {
    const cookies = parseCookieHeader(opts.req.headers.cookie || "");
    const token = cookies[CUSTOM_AUTH_COOKIE];
    
    console.log("[Context] Cookie presente:", !!token);
    
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as { empresaId: number; email: string };
      empresa = await db.getEmpresaById(decoded.empresaId);
      console.log("[Context] Empresa autenticada:", empresa ? empresa.email : "nenhuma");
    }
  } catch (error) {
    console.log("[Context] Erro ao verificar token:", error);
    empresa = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user: null, // Não usamos mais Manus OAuth
    empresa,
  };
}

export { CUSTOM_AUTH_COOKIE };

