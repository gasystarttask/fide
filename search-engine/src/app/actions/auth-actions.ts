"use server";

import { signIn, signOut } from "@search/lib/auth";

export async function signInAction() {
  await signIn("keycloak");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
