// src/hooks/use-supabase-todos.ts - Component for calling the edge functions(Adding, Deleting, Updating) tasks

import { useState, useEffect, useCallback } from "react";
import { Todo, TodoFormValues } from "@/types/todo";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  fetchTodosFromEdgeFunction, 
  createTodoViaEdgeFunction,
  updateTodoViaEdgeFunction,
  deleteTodoViaEdgeFunction
} from "@/services/edge-functions-service";

export const useSupabaseTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load todos
  const loadTodos = useCallback(async () => {
    if (!user?.id) return; // Check for user.id
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchTodosFromEdgeFunction();
      setTodos(data);
    } catch (err) {
      console.error("Error loading todos:", err);
      setError(err instanceof Error ? err : new Error("Failed to load todos"));
      toast({
        title: "Failed to load tasks",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]); // Depend on user.id for stability

  // Initial load
  useEffect(() => {
    if (user?.id) { // Check for user.id
      loadTodos();
    } else {
      // setIsLoading(false); // Ensure loading is false if no user
    }
  }, [user?.id, loadTodos]); // Depend on user.id for stability

  // Add a todo
  const addTodo = async (formValues: TodoFormValues) => {
    try {
      const newTodo = await createTodoViaEdgeFunction(formValues);
      setTodos((prevTodos) => [newTodo, ...prevTodos]);
      toast({
        title: "Task added",
        description: "Your new task has been added successfully.",
      });
      return newTodo;
    } catch (err) {
      console.error("Error adding todo:", err);
      toast({
        title: "Failed to add task",
        description: "Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Edit a todo
  const editTodo = async (id: string, formValues: Partial<TodoFormValues>) => {
    try {
      await updateTodoViaEdgeFunction(id, formValues);
      setTodos((prevTodos) =>
        prevTodos.map((todo) =>
          todo.id === id
            ? {
                ...todo,
                ...formValues,
                updatedAt: new Date().toISOString(),
              }
            : todo
        )
      );
      toast({
        title: "Task updated",
        description: "Your task has been updated successfully.",
      });
    } catch (err) {
      console.error("Error updating todo:", err);
      toast({
        title: "Failed to update task",
        description: "Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Toggle todo completion
  const toggleComplete = async (id: string) => {
    try {
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;
      
      const newStatus = !todo.completed;

      // Use the edge function to update the completed status
      const updatedTodoFromServer = await updateTodoViaEdgeFunction(id, { completed: newStatus });
      
      setTodos((prevTodos) =>
        prevTodos.map((t) =>
          t.id === id ? updatedTodoFromServer : t
        )
      );
      
      toast({
        title: newStatus ? "Task completed" : "Task reopened",
        description: newStatus
          ? "Your task has been marked as complete."
          : "Your task has been reopened.",
      });
    } catch (err) {
      console.error("Error toggling todo:", err);
      toast({
        title: "Failed to update task",
        description: "Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Delete a todo
  const deleteTodo = async (id: string) => {
    try {
      await deleteTodoViaEdgeFunction(id);
      setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id));
      toast({
        title: "Task deleted",
        description: "Your task has been deleted successfully.",
      });
    } catch (err) {
      console.error("Error deleting todo:", err);
      toast({
        title: "Failed to delete task",
        description: "Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Get active (incomplete) todos
  const getActiveTodos = () => {
    return todos.filter((todo) => !todo.completed);
  };

  // Get completed todos
  const getCompletedTodos = () => {
    return todos.filter((todo) => todo.completed);
  };

  return {
    todos,
    isLoading,
    error,
    loadTodos,
    addTodo,
    editTodo,
    toggleComplete,
    deleteTodo,
    getActiveTodos,
    getCompletedTodos,
  };
};
