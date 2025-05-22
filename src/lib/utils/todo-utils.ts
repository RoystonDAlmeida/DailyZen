// src/lib/utils/todo-utils.ts - utility functions for todo
import { Todo, TodoFormValues, TodoPriority } from "@/types/todo";

// Generate a unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Create a new todo item
export const createTodo = (formValues: TodoFormValues): Todo => {
  const now = new Date().toISOString();
  
  return {
    id: generateId(),
    title: formValues.title,
    description: formValues.description || '',
    completed: false,
    priority: formValues.priority,
    created_at: now,
    updated_at: now
  };
};

// Update an existing todo item
export const updateTodo = (todo: Todo, formValues: Partial<TodoFormValues>): Todo => {
  return {
    ...todo,
    ...formValues,
    updated_at: new Date().toISOString()
  };
};

// Toggle the completed status of a todo item
export const toggleTodoCompleted = (todo: Todo): Todo => {
  return {
    ...todo,
    completed: !todo.completed,
    updated_at: new Date().toISOString()
  };
};

// Save todos to localStorage
export const saveTodos = (todos: Todo[]): void => {
  localStorage.setItem('todos', JSON.stringify(todos));
};

// Load todos from localStorage
export const loadTodos = (): Todo[] => {
  const todosJson = localStorage.getItem('todos');
  
  if (!todosJson) {
    return [];
  }
  
  try {
    return JSON.parse(todosJson);
  } catch (error) {
    console.error('Failed to parse todos from localStorage', error);
    return [];
  }
};

// Format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Get the priority color
export const getPriorityColor = (priority: TodoPriority): string => {
  switch (priority) {
    case 'low':
      return 'bg-todo-low';
    case 'medium':
      return 'bg-todo-medium';
    case 'high':
      return 'bg-todo-high';
    default:
      return 'bg-todo-low';
  }
};

// Get the priority text color
export const getPriorityTextColor = (priority: TodoPriority): string => {
  switch (priority) {
    case 'low':
      return 'text-purple-800';
    case 'medium':
      return 'text-white';
    case 'high':
      return 'text-white';
    default:
      return 'text-purple-800';
  }
};
