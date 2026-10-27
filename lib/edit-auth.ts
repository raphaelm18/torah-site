import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";

export const EDIT_COOKIE = "edit_session";

function tokenFor(password: string) {
  return createHmac("sha256", password).update("torah-site-edit").digest("hex");
}

export function editingConfigured() {
  return Boolean(process.env.EDIT_PASSWORD);
}

export function passwordMatches(input: string) {
  const expected = process.env.EDIT_PASSWORD;
  if (!expected) return false;
  const given = Buffer.from(input);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length) return false;
  return timingSafeEqual(given, wanted);
}

export function sessionToken() {
  const password = process.env.EDIT_PASSWORD;
  if (!password) return "";
  return tokenFor(password);
}

async function hasEditSession() {
  const expected = sessionToken();
  if (!expected) return false;
  const got = (await cookies()).get(EDIT_COOKIE)?.value ?? "";
  if (got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export async function canEdit() {
  await connection();
  return hasEditSession();
}

export async function canEditRequest() {
  return hasEditSession();
}
