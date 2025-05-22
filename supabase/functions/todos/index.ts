import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
// Create a Supabase client for the function
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);
// Initialize Google Generative AI with the API key
const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') ?? '');
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  // Get the JWT token from the request
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({
      error: 'Missing Authorization header'
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  // Verify the token and get user information
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({
      error: 'Invalid token'
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  const userId = user.id;
  try {
    // Get the user's profile to retrieve their Slack webhook URL
    const { data: profileData, error: profileError } = await supabase.from('profiles').select('slack_webhook_url').eq('id', userId).single();
    if (profileError) throw profileError;
    const slackWebhookUrl = profileData?.slack_webhook_url;
    if (!slackWebhookUrl) {
      return new Response(JSON.stringify({
        error: 'Slack webhook URL not configured. Please add it in your profile settings.'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Fetch the user's todos
    const { data: todos, error: todosError } = await supabase.from('todos').select('*').eq('user_id', userId).eq('completed', false) // Only get incomplete todos
    .order('created_at', {
      ascending: false
    });
    if (todosError) throw todosError;
    if (!todos || todos.length === 0) {
      return new Response(JSON.stringify({
        message: 'No pending todos to summarize'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Format todos as text for the LLM
    const todoText = todos.map((todo)=>`Title: ${todo.title}\nDescription: ${todo.description || 'None'}\nPriority: ${todo.priority}`).join('\n\n');
    // Generate summary with Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash"
    });
    const prompt = `Please summarize the following to-do list items.
    Format the summary for a Slack message using Slack's markdown.
    The summary should be concise, professional, and actionable.
    Organize the summary by priority.
    For High priority tasks, prefix them with a 🔴 (red circle) emoji.
    For Medium priority tasks, prefix them with a 🟡 (yellow circle) emoji.
    For Low priority tasks, prefix them with a 🟢 (green circle) emoji.
    Under each priority, list the tasks as bullet points.
    Within each bullet point, make the task title bold (e.g., *Task Title*: Description...).
    Start the summary with a clear heading like "Key Action Items:".
    
    ${todoText}`;
    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    // Send the summary to Slack
    const slackMessage = {
      text: "📋 *Todo List Summary*",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📋 Todo List Summary",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: summary
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `_Generated at ${new Date().toLocaleString()}_`
            }
          ]
        }
      ]
    };
    const slackResponse = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackMessage)
    });
    if (!slackResponse.ok) {
      const slackError = await slackResponse.text();
      throw new Error(`Failed to send to Slack: ${slackError}`);
    }
    return new Response(JSON.stringify({
      success: true,
      message: 'Todo summary sent to Slack successfully',
      summary
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
