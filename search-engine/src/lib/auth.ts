import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

declare module "next-auth" {
  interface Session {
    idToken?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    idToken?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER,
    }),
  ],
  // Stateless — no session persistence needed, we only use Keycloak to
  // establish this app's own session cookie.
  session: { strategy: "jwt" },
  callbacks: {
    // Keep Keycloak's id_token around (JWT sessions don't retain it by
    // default) so sign-out can end the Keycloak SSO session too, via
    // id_token_hint — see buildKeycloakEndSessionUrl in keycloak-logout.ts.
    async jwt({ token, account }) {
      if (account?.id_token) {
        token.idToken = account.id_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.idToken) {
        session.idToken = token.idToken;
      }
      return session;
    },
  },
});
