export interface OfficeHoursEntry {
  id: number;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  break_start?: string;
  break_end?: string;
  total_hours: number;
  break_duration: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface OfficeHoursEntryCreate {
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  break_start?: string;
  break_end?: string;
  total_hours?: number;
  break_duration?: number;
  notes?: string;
}

export interface OfficeHoursEntryUpdate {
  check_in_time?: string;
  check_out_time?: string;
  break_start?: string;
  break_end?: string;
  total_hours?: number;
  break_duration?: number;
  notes?: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  category: string;
  priority: number;
  completed: boolean;
  due_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  category: string;
  priority?: number;
  completed?: boolean;
  due_date?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  category?: string;
  priority?: number;
  completed?: boolean;
  due_date?: string;
}

export interface PDFBook {
  id: number;
  name: string;
  original_filename: string;
  file_path: string;
  total_pages: number;
  current_page: number;
  current_chunk: number;
  current_sentence: number;
  progress_percentage: number;
  reading_mode: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface PDFBookCreate {
  name: string;
}

export interface PDFBookUpdate {
  name?: string;
  current_page?: number;
  current_chunk?: number;
  current_sentence?: number;
  progress_percentage?: number;
  reading_mode?: string;
  status?: string;
}

export interface ReadingSession {
  id: number;
  book_id: number;
  chunks_read: number;
  time_spent: number;
  session_date: string;
}

export interface ReadingSessionCreate {
  book_id: number;
  chunks_read?: number;
  time_spent?: number;
}

export type EisenhowerCategory = 
  | 'urgent_important'
  | 'urgent_not_important'
  | 'not_urgent_important'
  | 'not_urgent_not_important';
