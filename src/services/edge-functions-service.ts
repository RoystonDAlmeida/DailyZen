// src/services/edge-functions-service.ts - Component consisting of functions that call the edge functions

import { supabase } from "@/integrations/supabase/client";
import { Todo, TodoFormValues } from "@/types/todo";

// Get todos from Edge Function
export const fetchTodosFromEdgeFunction = async (): Promise<Todo[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");

  const response = await supabase.functions.invoke('todos', {
    method: 'GET',
  });
  
  if (response.error) throw new Error(response.error.message);
  return response.data;
};

// Create todo via Edge Function
export const createTodoViaEdgeFunction = async (todo: TodoFormValues): Promise<Todo> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");

  const response = await supabase.functions.invoke('todos', {
    method: 'POST',
    body: todo
  });
  
  if (response.error) throw new Error(response.error.message);
  return response.data;
};

// Delete todo via Edge Function
export const deleteTodoViaEdgeFunction = async (id: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");

  const response = await supabase.functions.invoke(`todos/${id}`, {
    method: 'DELETE',
  });
  
  if (response.error) throw new Error(response.error.message);
};

// Update todo via Edge Function
export const updateTodoViaEdgeFunction = async (id: string, updates: Partial<TodoFormValues>): Promise<Todo> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");

  // Call the 'todos' edge function with the todo ID in the path and PATCH method
  const response = await supabase.functions.invoke(`todos/${id}`, { 
    method: 'PATCH', 
    body: updates, // Send the updates object as the request body
  });
  
  if (response.error) throw new Error(response.error.message);
  // Assuming the edge function returns the updated todo item on success
  return response.data; 
};

// Summarize todos and send to Slack
export const summarizeTodosToSlack = async (): Promise<{summary: string}> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");

  const response = await supabase.functions.invoke('summarize', {
    method: 'POST',
  });
  
  if (response.error) throw new Error(response.error.message);
  return response.data;
};
