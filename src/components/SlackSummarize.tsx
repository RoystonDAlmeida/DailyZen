// src/components/SlackSummarize.tsx - Component to summarize todos to Slack

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { summarizeTodosToSlack } from "@/services/edge-functions-service";
import { MessagesSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";

export function SlackSummarize() {
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const handleSummarize = async () => {
    if (!profile?.slack_webhook_url) {
      toast.error(
        "Slack webhook not configured", 
        { 
          description: "Please add your Slack webhook URL in your profile settings.",
          action: {
            label: "Settings",
            onClick: () => navigate("/profile")
          }
        }
      );
      return;
    }
    
    setIsLoading(true);
    try {
      const { summary } = await summarizeTodosToSlack();
      toast.success("Summary sent to Slack", {
        description: "Your todo summary has been sent to your Slack channel."
      });
      
      // Also show the summary in a toast for convenience
      toast("Todo Summary", {
        description: summary.length > 200 ? summary.substring(0, 200) + "..." : summary,
        duration: 10000
      });
      
    } catch (error) {
      toast.error("Failed to send summary", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleSummarize} 
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      <MessagesSquare className="h-4 w-4" />
      {isLoading ? "Summarizing..." : "Summarize to Slack"}
    </Button>
  );
}
