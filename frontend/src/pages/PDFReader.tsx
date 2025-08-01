import React, { useState, useEffect } from 'react';
import { pdfBooksAPI, readingSessionsAPI } from '../services/api';
import type { PDFBook, ReadingSession, ReadingSessionCreate } from '../types';

const PDFReader: React.FC = () => {
  const [books, setBooks] = useState<PDFBook[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [activeBook, setActiveBook] = useState<PDFBook | null>(null);
  const [activeSession, setActiveSession] = useState<ReadingSession | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bookName, setBookName] = useState('');

  useEffect(() => {
    loadBooks();
    loadSessions();
  }, []);

  const loadBooks = async () => {
    try {
      const allBooks = await pdfBooksAPI.getAll();
      setBooks(allBooks);
    } catch (error) {
      console.error('Error loading books:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const allSessions = await readingSessionsAPI.getAll();
      setSessions(allSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !bookName) return;

    try {
      await pdfBooksAPI.upload(selectedFile, bookName);
      setSelectedFile(null);
      setBookName('');
      setShowUploadForm(false);
      loadBooks();
    } catch (error) {
      console.error('Error uploading book:', error);
    }
  };

  const startReadingSession = async (book: PDFBook) => {
    try {
      const sessionData: ReadingSessionCreate = {
        book_id: book.id,
        chunks_read: 0,
        time_spent: 0,
      };
      
      const session = await readingSessionsAPI.create(sessionData);
      setActiveBook(book);
      setActiveSession(session);
      setIsReading(true);
      setSessionStartTime(new Date());
    } catch (error) {
      console.error('Error starting reading session:', error);
    }
  };

  const endReadingSession = async () => {
    if (!activeSession || !sessionStartTime) return;

    try {
      const endTime = new Date();
      const timeSpent = Math.round((endTime.getTime() - sessionStartTime.getTime()) / 1000 / 60);

      await readingSessionsAPI.update(activeSession.id, {
        time_spent: timeSpent,
      });

      setIsReading(false);
      setActiveBook(null);
      setActiveSession(null);
      setSessionStartTime(null);
      loadSessions();
    } catch (error) {
      console.error('Error ending reading session:', error);
    }
  };

  const updateChunksRead = async (chunks: number) => {
    if (!activeSession) return;

    try {
      await readingSessionsAPI.update(activeSession.id, { chunks_read: chunks });
    } catch (error) {
      console.error('Error updating chunks:', error);
    }
  };

  const getBookSessions = (bookId: number) => {
    return sessions.filter(session => session.book_id === bookId);
  };

  const getTotalReadingTime = (bookId: number) => {
    const bookSessions = getBookSessions(bookId);
    return bookSessions.reduce((total, session) => total + (session.time_spent || 0), 0);
  };

  const getTotalChunks = (bookId: number) => {
    const bookSessions = getBookSessions(bookId);
    return bookSessions.reduce((total, session) => total + (session.chunks_read || 0), 0);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-600 mb-2">
          ADHD-Friendly PDF Reader
        </h1>
        <p className="text-gray-600">Track your reading progress with chunk-based reading</p>
      </div>

      {/* Active Reading Session */}
      {isReading && activeBook && activeSession && (
        <div className="bg-gradient-to-r from-green-100 to-blue-100 p-6 rounded-lg mb-8 border-2 border-green-300">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Currently Reading</h3>
              <p className="text-lg font-medium text-green-700">{activeBook.name}</p>
              <p className="text-gray-600">Progress: {activeBook.progress_percentage.toFixed(1)}%</p>
            </div>
            <button
              onClick={endReadingSession}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 smooth-transition"
            >
              End Session
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chunks Read This Session
              </label>
              <input
                type="number"
                min="0"
                defaultValue={activeSession.chunks_read}
                onChange={(e) => updateChunksRead(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Duration
              </label>
              <div className="text-2xl font-bold text-green-600">
                {sessionStartTime && 
                  Math.round((new Date().getTime() - sessionStartTime.getTime()) / 1000 / 60)} min
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Current Position: Page {activeBook.current_page} • Chunk {activeBook.current_chunk} • Sentence {activeBook.current_sentence}
            </p>
          </div>
        </div>
      )}

      {/* Upload Book Button */}
      {!isReading && (
        <div className="mb-8 text-center">
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg smooth-transition"
          >
            + Upload New Book
          </button>
        </div>
      )}

      {/* Upload Book Form */}
      {showUploadForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Upload New Book</h3>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Book Name
              </label>
              <input
                type="text"
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PDF File
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 smooth-transition"
              >
                Upload Book
              </button>
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 smooth-transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Books Library */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {books.map((book) => {
          const bookSessions = getBookSessions(book.id);
          const totalTime = getTotalReadingTime(book.id);
          const totalChunks = getTotalChunks(book.id);

          return (
            <div key={book.id} className="bg-white rounded-lg shadow-md p-6 border hover:shadow-lg smooth-transition">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">{book.name}</h3>
                <p className="text-gray-600 text-sm">
                  {book.original_filename}
                </p>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress:</span>
                  <span className="font-medium">{book.progress_percentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Reading Time:</span>
                  <span className="font-medium">{totalTime} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Chunks Read:</span>
                  <span className="font-medium">{totalChunks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current Page:</span>
                  <span className="font-medium">{book.current_page} of {book.total_pages}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Reading Sessions:</span>
                  <span className="font-medium">{bookSessions.length}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${book.progress_percentage}%` }}
                  ></div>
                </div>
              </div>

              {!isReading ? (
                <button
                  onClick={() => startReadingSession(book)}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white py-2 rounded-lg font-semibold hover:shadow-md smooth-transition"
                >
                  Continue Reading
                </button>
              ) : (
                <div className="text-center text-gray-500">
                  Currently reading another book
                </div>
              )}

              {/* Recent Sessions */}
              {bookSessions.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Sessions</h4>
                  <div className="space-y-2">
                    {bookSessions.slice(-3).reverse().map((session) => (
                      <div key={session.id} className="text-xs text-gray-600 flex justify-between">
                        <span>{new Date(session.session_date).toLocaleDateString()}</span>
                        <span>{session.time_spent || 0} min • {session.chunks_read || 0} chunks</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {books.length === 0 && !showUploadForm && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-lg">No books in your library yet</p>
            <p>Upload your first PDF to start tracking your reading progress</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFReader;
