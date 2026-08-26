import { PageHeader } from "@/components/ui";
import ChatUI from "@/components/ChatUI";

export default function AdminChatPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="AI Assistant" subtitle="Government-level analytics queries grounded in live data." />
      <ChatUI
        roleLabel="Administrator"
        suggestions={[
          "How many faults occurred this month?",
          "Which district has the most outages?",
          "What is the SLA compliance rate?",
          "Which areas have repeated faults?",
        ]}
      />
    </div>
  );
}
