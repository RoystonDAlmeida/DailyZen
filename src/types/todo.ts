// src/types/todo.ts - Type definitions for todo

export type TodoPriority = 'low' | 'medium' | 'high';

// Interface for todo item response obtained from edge function
export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: TodoPriority;
  updated_at: string; 
  created_at: string;
}

export interface TodoFormValues {
  title: string;
  description?: string;
  priority: TodoPriority;
  completed?: boolean;  // Add completed as an optional property
}
