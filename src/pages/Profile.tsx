// src/pages/Profile.tsx - Component to set Slack webhook

import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const Profile = () => {
  const { profile, updateProfile } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState(profile?.slack_webhook_url || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await updateProfile({ slack_webhook_url: webhookUrl });
    } catch (err) {
      // Error already handled in the updateProfile function
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your profile settings and preferences.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
              <Input
                id="slack-webhook"
                type="text"
                placeholder="https://hooks.slack.com/services/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Create an <a 
                  href="https://api.slack.com/messaging/webhooks" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  incoming webhook
                </a> for your Slack workspace to receive todo summaries.
              </p>
            </div>
          </CardContent>
          
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/" className="underline hover:text-primary">
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default Profile;
