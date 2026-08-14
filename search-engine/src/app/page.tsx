import { auth } from "@search/lib/auth";
import { ChatApp } from "./components/ChatApp";
import { SignInGate } from "./components/SignInGate";

export default async function Home() {
  const session = await auth();

  if (!session) {
    return <SignInGate />;
  }

  return <ChatApp />;
}
