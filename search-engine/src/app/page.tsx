import { auth } from "@search/lib/auth";
import { signInAction } from "./actions/auth-actions";
import { ChatApp } from "./components/ChatApp";
import { Button } from "./components/ui/Button";

export default async function Home() {
  const session = await auth();

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-main">
        <p className="text-b3 text-medium-gray">Please sign in to use the Bible search assistant.</p>
        <form action={signInAction}>
          <Button type="submit" variant="primary" size="md">
            Sign in
          </Button>
        </form>
      </main>
    );
  }

  return <ChatApp />;
}
