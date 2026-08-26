import { PageHeader } from "@/components/ui";
import ChatUI from "@/components/ChatUI";

export default function UserChatPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="AI Assistant" subtitle="Ask about power in your area — answers come from live data." />
      <ChatUI
        roleLabel="Citizen"
        suggestions={[
          "Is there electricity in my area?",
          "Why is there no electricity?",
          "When will electricity return?",
          "Has my complaint been received?",
        ]}
      />
    </div>
  );
}
