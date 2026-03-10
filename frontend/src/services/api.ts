import axios from 'axios';
import type {
  OfficeHoursEntry,
  OfficeHoursEntryCreate,
  OfficeHoursEntryUpdate,
  Task,
  TaskCreate,
  TaskUpdate,
  PDFBook,
  PDFBookUpdate,
  ReadingSession,
  ReadingSessionCreate,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Office Hours API
export const officeHoursAPI = {
  getAll: (): Promise<OfficeHoursEntry[]> =>
    api.get('/office-hours/').then(res => res.data),
  
  getById: (id: number): Promise<OfficeHoursEntry> =>
    api.get(`/office-hours/${id}`).then(res => res.data),
  
  getByDate: (date: string): Promise<OfficeHoursEntry> =>
    api.get(`/office-hours/date/${date}`).then(res => res.data),
  
  create: (entry: OfficeHoursEntryCreate): Promise<OfficeHoursEntry> =>
    api.post('/office-hours/', entry).then(res => res.data),
  
  update: (id: number, entry: OfficeHoursEntryUpdate): Promise<OfficeHoursEntry> =>
    api.put(`/office-hours/${id}`, entry).then(res => res.data),
  
  delete: (id: number): Promise<void> =>
    api.delete(`/office-hours/${id}`).then(res => res.data),
};

// Tasks API
export const tasksAPI = {
  getAll: (): Promise<Task[]> =>
    api.get('/tasks/').then(res => res.data),
  
  getById: (id: number): Promise<Task> =>
    api.get(`/tasks/${id}`).then(res => res.data),
  
  getByCategory: (category: string): Promise<Task[]> =>
    api.get(`/tasks/category/${category}`).then(res => res.data),
  
  create: (task: TaskCreate): Promise<Task> =>
    api.post('/tasks/', task).then(res => res.data),
  
  update: (id: number, task: TaskUpdate): Promise<Task> =>
    api.put(`/tasks/${id}`, task).then(res => res.data),
  
  delete: (id: number): Promise<void> =>
    api.delete(`/tasks/${id}`).then(res => res.data),
};

// PDF Books API
export const pdfBooksAPI = {
  getAll: (): Promise<PDFBook[]> =>
    api.get('/pdf-books/').then(res => res.data),
  
  getById: (id: number): Promise<PDFBook> =>
    api.get(`/pdf-books/${id}`).then(res => res.data),
  
  upload: (file: File, name?: string): Promise<PDFBook> => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    
    return api.post('/pdf-books/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => res.data);
  },
  
  update: (id: number, book: PDFBookUpdate): Promise<PDFBook> =>
    api.put(`/pdf-books/${id}`, book).then(res => res.data),
  
  delete: (id: number): Promise<void> =>
    api.delete(`/pdf-books/${id}`).then(res => res.data),
  
  createSession: (bookId: number, session: ReadingSessionCreate): Promise<ReadingSession> =>
    api.post(`/pdf-books/${bookId}/sessions`, session).then(res => res.data),
  
  getSessions: (bookId: number): Promise<ReadingSession[]> =>
    api.get(`/pdf-books/${bookId}/sessions`).then(res => res.data),
};

// Reading Sessions API (separate from PDF Books)
export const readingSessionsAPI = {
  getAll: (): Promise<ReadingSession[]> =>
    api.get('/reading-sessions/').then(res => res.data),
  
  getById: (id: number): Promise<ReadingSession> =>
    api.get(`/reading-sessions/${id}`).then(res => res.data),
  
  create: (session: ReadingSessionCreate): Promise<ReadingSession> =>
    api.post('/reading-sessions/', session).then(res => res.data),
  
  update: (id: number, session: Partial<ReadingSession>): Promise<ReadingSession> =>
    api.put(`/reading-sessions/${id}`, session).then(res => res.data),
  
  delete: (id: number): Promise<void> =>
    api.delete(`/reading-sessions/${id}`).then(res => res.data),
};

export default api;
