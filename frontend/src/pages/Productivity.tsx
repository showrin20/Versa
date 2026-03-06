import React from 'react';
import { Link } from 'react-router-dom';

const Productivity: React.FC = () => {
  const tips = [
    {
      title: "The Pomodoro Technique",
      description: "Work for 25 minutes, then take a 5-minute break. After 4 cycles, take a longer 15-30 minute break.",
      icon: "⏱️",
      category: "Time Management"
    },
    {
      title: "Eisenhower Matrix",
      description: "Organize tasks by urgency and importance. Focus on important tasks first.",
      icon: "📊",
      category: "Task Management"
    },
    {
      title: "Time Blocking",
      description: "Schedule specific time blocks for different types of work throughout your day.",
      icon: "🗓️",
      category: "Time Management"
    },
    {
      title: "Two-Minute Rule",
      description: "If a task takes less than 2 minutes, do it immediately instead of adding it to your to-do list.",
      icon: "⚡",
      category: "Task Management"
    },
    {
      title: "Single-tasking Focus",
      description: "Focus on one task at a time. Multitasking reduces overall productivity and quality.",
      icon: "🎯",
      category: "Focus"
    },
    {
      title: "Environment Design",
      description: "Create a dedicated workspace that minimizes distractions and promotes focus.",
      icon: "🏠",
      category: "Environment"
    },
    {
      title: "Regular Breaks",
      description: "Take short breaks every hour to maintain energy and focus throughout the day.",
      icon: "☕",
      category: "Well-being"
    },
    {
      title: "Weekly Reviews",
      description: "Review your progress weekly to adjust goals and improve your productivity systems.",
      icon: "📝",
      category: "Planning"
    }
  ];

  const tools = [
    {
      title: "PDF Reader",
      description: "ADHD-friendly PDF reading with chunk-based progress tracking",
      link: "/pdf-reader",
      icon: "📚",
      color: "from-green-500 to-blue-600"
    },
    {
      title: "Office Hours",
      description: "Track your work hours with precise check-in/check-out functionality",
      link: "/office-hours",
      icon: "⏰",
      color: "from-purple-500 to-pink-600"
    },
    {
      title: "Task Matrix",
      description: "Organize tasks using the Eisenhower Matrix for better prioritization",
      link: "/hub",
      icon: "📋",
      color: "from-blue-500 to-purple-600"
    }
  ];

  const categories = ["All", "Time Management", "Task Management", "Focus", "Environment", "Well-being", "Planning"];
  const [selectedCategory, setSelectedCategory] = React.useState("All");

  const filteredTips = selectedCategory === "All"
    ? tips
    : tips.filter(tip => tip.category === selectedCategory);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 mb-2">
          Productivity Center
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Tips, tools, and techniques to boost your productivity</p>
      </div>

      {/* Quick Access Tools */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">Your Productivity Tools</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {tools.map((tool, index) => (
            <Link
              key={index}
              to={tool.link}
              className="block bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border hover:shadow-lg smooth-transition transform hover:-translate-y-1"
            >
              <div className={`text-4xl mb-4 w-16 h-16 flex items-center justify-center rounded-lg bg-gradient-to-r ${tool.color} text-white`}>
                {tool.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">{tool.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{tool.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Productivity Tips */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">Productivity Tips & Techniques</h2>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium smooth-transition ${selectedCategory === category
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Tips Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTips.map((tip, index) => (
            <div key={index} className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border hover:shadow-lg smooth-transition">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">{tip.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{tip.title}</h3>
                    <span className="text-xs px-2 py-1 bg-orange-100 text-orange-600 rounded-full">
                      {tip.category}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{tip.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Productivity Stats
      <div className="mt-12 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg p-8 border-2 border-orange-200">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6 text-center">Your Productivity Journey</h2>
        
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">8</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Productivity Tips</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">3</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Tracking Tools</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">6</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Categories</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">∞</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Possibilities</div>
          </div>
        </div>
        
        <div className="text-center mt-6">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Consistency beats perfection. Start with one technique and build from there.
          </p>
          <Link
            to="/hub"
            className="inline-block bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg smooth-transition"
          >
            Start Organizing Tasks
          </Link>
        </div>
      </div> */}

      {/* ADHD-Specific Tips */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">ADHD-Friendly Strategies</h2>

        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-6 rounded-lg">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-blue-800 dark:text-gray-200 mb-3">For Better Focus</h3>
              <ul className="space-y-2 text-blue-700 dark:text-gray-200">
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Use timers for focused work sessions
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Break large tasks into smaller chunks
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Remove distractions from your workspace
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Use background music or white noise
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-blue-800 mb-3">For Organization</h3>
              <ul className="space-y-2 text-blue-700 dark:text-gray-200">
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Use visual reminders and calendars
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Create routines and stick to them
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Write everything down immediately
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Use the tools in this app consistently
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Productivity;
