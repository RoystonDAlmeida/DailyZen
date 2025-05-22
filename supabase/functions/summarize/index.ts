// Define CORS headers to allow browser access to the API
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS"
};
// Create a Supabase client for the function
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
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
  const url = new URL(req.url);
  const path = url.pathname.split('/').filter(Boolean);
  try {
    // GET /todos - Fetch all todos for the current user
    if (req.method === 'GET' && path.length === 1 && path[0] === 'todos') {
      const { data, error } = await supabase.from('todos').select('*').eq('user_id', userId).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // POST /todos - Create a new todo
    if (req.method === 'POST' && path.length === 1 && path[0] === 'todos') {
      const { title, description, priority } = await req.json();
      const todoItem = {
        title,
        description,
        priority,
        user_id: userId,
        completed: false
      };
      const { data, error } = await supabase.from('todos').insert([
        todoItem
      ]).select();
      if (error) throw error;
      return new Response(JSON.stringify(data[0]), {
        status: 201,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // PATCH /todos/:id - Update an existing todo
    if (req.method === 'PATCH' && path.length === 2 && path[0] === 'todos') {
      const todoId = path[1];
      const updates = await req.json();
      // Ensure user_id is not being overwritten from client, and set updated_at
      const updatesForDb = {
        ...updates,
        // user_id: userId, // user_id should not be updatable, RLS and .eq('user_id', userId) handles ownership
        updated_at: new Date().toISOString()
      };
      // Remove fields that shouldn't be updated directly by client if present
      delete updatesForDb.id;
      delete updatesForDb.user_id;
      delete updatesForDb.created_at;
      const { data, error } = await supabase.from('todos').update(updatesForDb).eq('id', todoId).eq('user_id', userId) // Important: Ensure user can only update their own todos
      .select().single(); // Return the updated item
      if (error) {
        // Check for PostgREST error for "Fetched zero rows" which means todo not found or no permission
        if (error.code === 'PGRST116') {
          return new Response(JSON.stringify({
            error: 'Todo not found or permission denied'
          }), {
            status: 404,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
        throw error; // Re-throw other errors
      }
      // If data is null after a successful update attempt without error (should be caught by PGRST116)
      if (!data) {
        return new Response(JSON.stringify({
          error: 'Todo not found or permission denied after update attempt'
        }), {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // DELETE /todos/:id - Delete a todo
    if (req.method === 'DELETE' && path.length === 2 && path[0] === 'todos') {
      const todoId = path[1];
      // First verify that this todo belongs to the user
      const { data: todoData, error: todoError } = await supabase.from('todos').select('id').eq('id', todoId).eq('user_id', userId).maybeSingle();
      if (todoError) throw todoError;
      if (!todoData) {
        return new Response(JSON.stringify({
          error: 'Todo not found or you do not have permission'
        }), {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      const { error } = await supabase.from('todos').delete().eq('id', todoId).eq('user_id', userId);
      if (error) throw error;
      return new Response(JSON.stringify({
        success: true
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    return new Response(JSON.stringify({
      error: 'Not found'
    }), {
      status: 404,
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
