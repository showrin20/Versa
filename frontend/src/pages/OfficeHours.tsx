import React, { useState, useEffect } from 'react';
import { officeHoursAPI } from '../services/api';
import type { OfficeHoursEntry, OfficeHoursEntryCreate } from '../types';

const OfficeHours: React.FC = () => {
  const [entries, setEntries] = useState<OfficeHoursEntry[]>([]);
  const [todayEntry, setTodayEntry] = useState<OfficeHoursEntry | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadEntries();
    loadTodayEntry();
    
    // Update current time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const loadEntries = async () => {
    try {
      const allEntries = await officeHoursAPI.getAll();
      setEntries(allEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const loadTodayEntry = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const entry = await officeHoursAPI.getByDate(today);
      setTodayEntry(entry);
      setIsCheckedIn(!!entry.check_in_time && !entry.check_out_time);
      setIsOnBreak(!!entry.break_start && !entry.break_end);
    } catch (error) {
      // No entry for today yet
      setTodayEntry(null);
      setIsCheckedIn(false);
      setIsOnBreak(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().split(' ')[0];
      
      if (todayEntry) {
        // Update existing entry
        await officeHoursAPI.update(todayEntry.id, {
          check_in_time: now,
        });
      } else {
        // Create new entry
        const entryData: OfficeHoursEntryCreate = {
          date: today,
          check_in_time: now,
          total_hours: 0,
          break_duration: 0,
        };
        await officeHoursAPI.create(entryData);
      }
      
      setIsCheckedIn(true);
      loadTodayEntry();
      loadEntries();
    } catch (error) {
      console.error('Error checking in:', error);
    }
  };

  const handleCheckOut = async () => {
    if (!todayEntry) return;

    try {
      const now = new Date().toTimeString().split(' ')[0];
      const checkInTime = new Date(`1970-01-01T${todayEntry.check_in_time}`);
      const checkOutTime = new Date(`1970-01-01T${now}`);
      
      let totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      totalHours -= todayEntry.break_duration / 60; // Subtract break time
      
      await officeHoursAPI.update(todayEntry.id, {
        check_out_time: now,
        total_hours: Math.max(0, totalHours),
      });
      
      setIsCheckedIn(false);
      setIsOnBreak(false);
      loadTodayEntry();
      loadEntries();
    } catch (error) {
      console.error('Error checking out:', error);
    }
  };

  const handleStartBreak = async () => {
    if (!todayEntry) return;

    try {
      const now = new Date().toTimeString().split(' ')[0];
      await officeHoursAPI.update(todayEntry.id, {
        break_start: now,
      });
      
      setIsOnBreak(true);
      loadTodayEntry();
    } catch (error) {
      console.error('Error starting break:', error);
    }
  };

  const handleEndBreak = async () => {
    if (!todayEntry || !todayEntry.break_start) return;

    try {
      const now = new Date().toTimeString().split(' ')[0];
      const breakStart = new Date(`1970-01-01T${todayEntry.break_start}`);
      const breakEnd = new Date(`1970-01-01T${now}`);
      
      const breakDuration = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60); // minutes
      const totalBreakDuration = todayEntry.break_duration + breakDuration;
      
      await officeHoursAPI.update(todayEntry.id, {
        break_end: now,
        break_duration: totalBreakDuration,
      });
      
      setIsOnBreak(false);
      loadTodayEntry();
    } catch (error) {
      console.error('Error ending break:', error);
    }
  };

  const updateNotes = async (notes: string) => {
    if (!todayEntry) return;

    try {
      await officeHoursAPI.update(todayEntry.id, { notes });
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '--:--';
    return timeString.substring(0, 5); // HH:MM format
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getCurrentDuration = () => {
    if (!todayEntry?.check_in_time || !isCheckedIn) return 0;
    
    const checkInTime = new Date(`1970-01-01T${todayEntry.check_in_time}`);
    const now = new Date(`1970-01-01T${currentTime.toTimeString().split(' ')[0]}`);
    
    let duration = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    duration -= todayEntry.break_duration / 60; // Subtract break time
    
    return Math.max(0, duration);
  };

  const getWeeklyTotal = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return entries
      .filter(entry => new Date(entry.date) >= weekAgo)
      .reduce((total, entry) => total + entry.total_hours, 0);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600 mb-2">
          Office Hours Tracker
        </h1>
        <p className="text-gray-600">Track your work hours with precision</p>
      </div>

      {/* Current Status Card */}
      <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-lg mb-8 border-2 border-purple-300">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Today's Status</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Check-in:</span>
                <span className="font-medium">{formatTime(todayEntry?.check_in_time)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Check-out:</span>
                <span className="font-medium">{formatTime(todayEntry?.check_out_time)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Hours Worked:</span>
                <span className="font-medium text-purple-600">
                  {isCheckedIn ? formatDuration(getCurrentDuration()) : formatDuration(todayEntry?.total_hours || 0)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Break Time:</span>
                <span className="font-medium">{Math.round(todayEntry?.break_duration || 0)} min</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            {!isCheckedIn ? (
              <button
                onClick={handleCheckIn}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg smooth-transition"
              >
                Check In
              </button>
            ) : (
              <>
                <button
                  onClick={handleCheckOut}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg smooth-transition"
                >
                  Check Out
                </button>
                
                {!isOnBreak ? (
                  <button
                    onClick={handleStartBreak}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg smooth-transition"
                  >
                    Start Break
                  </button>
                ) : (
                  <button
                    onClick={handleEndBreak}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg smooth-transition"
                  >
                    End Break
                  </button>
                )}
              </>
            )}
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {currentTime.toLocaleTimeString()}
              </div>
              <div className="text-sm text-gray-600">
                {currentTime.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Notes Section */}
        {todayEntry && (
          <div className="mt-6 pt-6 border-t border-purple-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Today's Notes
            </label>
            <textarea
              defaultValue={todayEntry.notes}
              onChange={(e) => updateNotes(e.target.value)}
              placeholder="Add notes about your work today..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
            />
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Today</h4>
          <div className="text-2xl font-bold text-purple-600">
            {isCheckedIn ? formatDuration(getCurrentDuration()) : formatDuration(todayEntry?.total_hours || 0)}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">This Week</h4>
          <div className="text-2xl font-bold text-purple-600">
            {formatDuration(getWeeklyTotal())}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Total Entries</h4>
          <div className="text-2xl font-bold text-purple-600">
            {entries.length}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Work History</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Check In</th>
                <th className="text-left py-2">Check Out</th>
                <th className="text-left py-2">Break Time</th>
                <th className="text-left py-2">Total Hours</th>
                <th className="text-left py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b hover:bg-gray-50">
                  <td className="py-3">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="py-3">{formatTime(entry.check_in_time)}</td>
                  <td className="py-3">{formatTime(entry.check_out_time)}</td>
                  <td className="py-3">{Math.round(entry.break_duration)} min</td>
                  <td className="py-3 font-medium">{formatDuration(entry.total_hours)}</td>
                  <td className="py-3 text-sm text-gray-600 max-w-xs truncate">
                    {entry.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {entries.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No work entries yet. Check in to start tracking your hours!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfficeHours;
