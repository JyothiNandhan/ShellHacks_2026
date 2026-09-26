import type { Metadata } from "next";
import Dashboard from "../../components/Dashboard";
export const metadata: Metadata = {
  title: "Dashboard — Mind Your Prompt",
  description: "Your AI conversations, personal details shared, categories and privacy score in one place.",
};
export default function DashboardPage() {
  return (
    <main>
      <Dashboard />
    </main>
  );
}
