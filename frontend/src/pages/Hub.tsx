import React, { useState, useEffect } from 'react';
import { tasksAPI } from '../services/api';
import type { Task, TaskCreate, EisenhowerCategory } from '../types';

const Hub: React.FC = () => {
  const [tasks, setTasks] = useState<{ [key in EisenhowerCategory]: Task[] }>({
    urgent_important: [],
    urgent_not_important: [],
    not_urgent_important: [],
    not_urgent_not_important: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [newTask, setNewTask] = useState<TaskCreate>({
    title: '',
    description: '',
    category: 'urgent_important',
    priority: 1,
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const categoryLabels = {
    urgent_important: 'Urgent & Important (Do First)',
    urgent_not_important: 'Urgent & Not Important (Delegate)',
    not_urgent_important: 'Not Urgent & Important (Schedule)',
    not_urgent_not_important: 'Not Urgent & Not Important (Eliminate)',
  };

  const categoryColors = {
    urgent_important: 'bg-red-100 border-red-300',
    urgent_not_important: 'bg-orange-100 border-orange-300',
    not_urgent_important: 'bg-blue-100 border-blue-300',
    not_urgent_not_important: 'bg-gray-100 border-gray-300',
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const allTasks = await tasksAPI.getAll();
      
      const categorizedTasks = {
        urgent_important: allTasks.filter(task => task.category === 'urgent_important'),
        urgent_not_important: allTasks.filter(task => task.category === 'urgent_not_important'),
        not_urgent_important: allTasks.filter(task => task.category === 'not_urgent_important'),
        not_urgent_not_important: allTasks.filter(task => task.category === 'not_urgent_not_important'),
      };
      
      setTasks(categorizedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tasksAPI.create(newTask);
      setNewTask({
        title: '',
        description: '',
        category: 'urgent_important',
        priority: 1,
      });
      setShowAddForm(false);
      loadTasks();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleToggleComplete = async (taskId: number, completed: boolean) => {
    try {
      await tasksAPI.update(taskId, { completed: !completed });
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await tasksAPI.delete(taskId);
        loadTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 mb-2">
          Productivity Hub
        </h1>
        <p className="text-gray-600">Organize your tasks with the Eisenhower Matrix</p>
      </div>

      {/* Add Task Button */}
      <div className="mb-8 text-center">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg smooth-transition"
        >
          + Add New Task
        </button>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Add New Task</h3>
          <form onSubmit={handleAddTask} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Title
              </label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={newTask.category}
                onChange={(e) => setNewTask({ ...newTask, category: e.target.value as EisenhowerCategory })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 smooth-transition"
              >
                Add Task
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 smooth-transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Eisenhower Matrix */}
      <div className="grid md:grid-cols-2 gap-6">
        {Object.entries(categoryLabels).map(([category, label]) => (
          <div
            key={category}
            className={`p-6 rounded-lg border-2 ${categoryColors[category as EisenhowerCategory]}`}
          >
            <h3 className="text-lg font-semibold mb-4">{label}</h3>
            <div className="space-y-3">
              {tasks[category as EisenhowerCategory].map((task) => (
                <div
                  key={task.id}
                  className="bg-white p-4 rounded-lg shadow-sm border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4
                        className={`font-medium ${
                          task.completed ? 'line-through text-gray-500' : 'text-gray-800'
                        }`}
                      >
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleToggleComplete(task.id, task.completed)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          task.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {task.completed && '✓'}
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-500 hover:text-red-700 w-6 h-6 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {tasks[category as EisenhowerCategory].length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No tasks in this category
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Hub;
