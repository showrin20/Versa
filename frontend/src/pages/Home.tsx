import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Welcome to Versatile
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Your all-in-one productivity platform featuring ADHD-friendly PDF reading, 
            office hours tracking, task management, and productivity tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/hub"
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg smooth-transition transform hover:scale-105"
            >
              Get Started
            </Link>
            <Link
              to="/pdf-reader"
              className="bg-white text-gray-700 px-8 py-3 rounded-lg font-semibold border border-gray-300 hover:shadow-lg smooth-transition"
            >
              Try PDF Reader
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16 text-gray-800">
            Powerful Tools for Every Need
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 bg-white rounded-lg shadow-md hover-lift">
              <div className="text-4xl mb-4">🧠📄</div>
              <h3 className="text-xl font-semibold mb-2">ADHD PDF Reader</h3>
              <p className="text-gray-600">
                Read PDFs in small, manageable chunks with progress tracking and auto-resume.
              </p>
              <Link
                to="/pdf-reader"
                className="inline-block mt-4 text-blue-500 hover:text-blue-600 font-medium"
              >
                Learn More →
              </Link>
            </div>

            <div className="text-center p-6 bg-white rounded-lg shadow-md hover-lift">
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="text-xl font-semibold mb-2">Office Hours Tracker</h3>
              <p className="text-gray-600">
                Track your work hours, breaks, and generate detailed reports.
              </p>
              <Link
                to="/office-hours"
                className="inline-block mt-4 text-blue-500 hover:text-blue-600 font-medium"
              >
                Learn More →
              </Link>
            </div>

            <div className="text-center p-6 bg-white rounded-lg shadow-md hover-lift">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Eisenhower Matrix</h3>
              <p className="text-gray-600">
                Organize tasks by urgency and importance for better prioritization.
              </p>
              <Link
                to="/hub"
                className="inline-block mt-4 text-blue-500 hover:text-blue-600 font-medium"
              >
                Learn More →
              </Link>
            </div>

            <div className="text-center p-6 bg-white rounded-lg shadow-md hover-lift">
              <div className="text-4xl mb-4">💡</div>
              <h3 className="text-xl font-semibold mb-2">Productivity Tools</h3>
              <p className="text-gray-600">
                Access tips, techniques, and tools to boost your daily productivity.
              </p>
              <Link
                to="/productivity"
                className="inline-block mt-4 text-blue-500 hover:text-blue-600 font-medium"
              >
                Learn More →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8 text-gray-800">About Versatile</h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              Versatile is designed to help you manage your productivity challenges with 
              specialized tools that understand your unique needs. Whether you have ADHD, 
              struggle with traditional reading methods, or need better time management, 
              our platform provides the tools to help you succeed.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl mb-4 text-blue-500">🎯</div>
                <h3 className="font-semibold mb-2">Focus-Friendly</h3>
                <p className="text-gray-600 text-sm">
                  Built with ADHD and focus challenges in mind
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-4 text-purple-500">💾</div>
                <h3 className="font-semibold mb-2">Auto-Save</h3>
                <p className="text-gray-600 text-sm">
                  Never lose your progress with automatic saving
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-4 text-green-500">📱</div>
                <h3 className="font-semibold mb-2">Responsive</h3>
                <p className="text-gray-600 text-sm">
                  Works seamlessly on desktop and mobile devices
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
