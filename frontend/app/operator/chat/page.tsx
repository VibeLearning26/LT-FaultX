import { PageHeader } from "@/components/ui";
import ChatUI from "@/components/ChatUI";

export default function OperatorChatPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="AI Assistant" subtitle="Operational queries grounded in live backend data." />
      <ChatUI
        roleLabel="Operator"
        suggestions={[
          "Show active faults.",
          "Which nodes are offline?",
          "Which maintenance jobs are overdue?",
          "Where is the latest fault?",
        ]}
      />
    </div>
  );
}
