import { auth } from "@/auth";
import DummyClient from "@/components/dummy";
import Navbar from "@/components/Navbar";
export default async function Home() {
  const session = await auth();

  return (
    <main className="p-10">
      <Navbar />
      <DummyClient session={session} /> 
    </main>
  );
}
