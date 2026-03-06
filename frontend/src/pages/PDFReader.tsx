import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pdfBooksAPI, readingSessionsAPI } from '../services/api';
import type { PDFBook, ReadingSession, ReadingSessionCreate } from '../types';

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

interface Chunk {
  id: string;
  text: string;
  page: number;
  paragraphIndex: number;
}

interface NarratorPreset {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  previewVoiceHints: string[];
  backendVoice: string;
  backendStyle: string;
  previewRate: number;
  previewPitch: number;
  color: string;
}

const API_BASE_URL = 'http://localhost:8000/api/v1';

const NARRATORS: NarratorPreset[] = [
  {
    id: 'warm_female',
    name: 'Sage',
    emoji: '🫶',
    desc: 'Warm, calm, patient',
    previewVoiceHints: ['Microsoft Aria', 'Microsoft Jenny', 'Samantha', 'Karen', 'Google UK English Female'],
    backendVoice: 'en-US-JennyNeural',
    backendStyle: 'narration-professional',
    previewRate: 0.92,
    previewPitch: 0.98,
    color: '#8B5CF6',
  },
  {
    id: 'soft_female',
    name: 'Lyra',
    emoji: '🎧',
    desc: 'Soft, smooth, human-like',
    previewVoiceHints: ['Microsoft Sonia', 'Moira', 'Google US English'],
    backendVoice: 'en-GB-SoniaNeural',
    backendStyle: 'gentle',
    previewRate: 0.9,
    previewPitch: 1.0,
    color: '#EC4899',
  },
  {
    id: 'calm_male',
    name: 'Echo',
    emoji: '📖',
    desc: 'Rich, steady, natural',
    previewVoiceHints: ['Microsoft Ryan', 'Daniel', 'Google UK English Male'],
    backendVoice: 'en-GB-RyanNeural',
    backendStyle: 'calm',
    previewRate: 0.9,
    previewPitch: 0.96,
    color: '#14B8A6',
  },
];

const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const splitIntoNaturalChunks = (text: string, maxChars = 550): string[] => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [normalized];
  const output: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    const next = `${current} ${sentence}`.trim();
    if (next.length > maxChars && current.trim()) {
      output.push(current.trim());
      current = sentence.trim();
    } else {
      current = next;
    }
  }
  if (current.trim()) output.push(current.trim());
  return output;
};

const extractChunksFromPageText = (pageText: string, pageNumber: number): Chunk[] => {
  const paragraphs = pageText
    .split(/\n{2,}|(?<=[.!?])\s{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const chunks: Chunk[] = [];
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const parts = splitIntoNaturalChunks(paragraph);
    parts.forEach((part, partIndex) => {
      chunks.push({ id: `${pageNumber}-${paragraphIndex}-${partIndex}`, text: part, page: pageNumber, paragraphIndex });
    });
  });
  return chunks;
};

const PDFReader: React.FC = () => {
  const [books, setBooks] = useState<PDFBook[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [activeBook, setActiveBook] = useState<PDFBook | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bookName, setBookName] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [mode, setMode] = useState<'chunk' | 'sentence'>('chunk');
  const [chunksPerRead, setChunksPerRead] = useState(1);
  const [sentencesPerRead, setSentencesPerRead] = useState(1);
  const [fontSize, setFontSize] = useState(19);
  const [loadingText, setLoadingText] = useState('Opening book...');
  const [isProcessing, setIsProcessing] = useState(false);

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerDuration, setTimerDuration] = useState(20);
  const timerRef = useRef<number | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [storedSession, setStoredSession] = useState<ReadingSession | null>(null);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedNarrator, setSelectedNarrator] = useState<NarratorPreset>(NARRATORS[0]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [showPageJump, setShowPageJump] = useState(false);
  const [pageJumpInput, setPageJumpInput] = useState('');

  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioGenProgress, setAudioGenProgress] = useState(0);
  const [audioDownloadUrl, setAudioDownloadUrl] = useState<string | null>(null);

  const [pageAnim, setPageAnim] = useState<'idle' | 'forward' | 'backward'>('idle');
  const [showPdfView, setShowPdfView] = useState(true);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.6);
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderNonceRef = useRef(0);

  // Book management states
  const [editingBookId, setEditingBookId] = useState<number | null>(null);
  const [editingBookName, setEditingBookName] = useState('');

  useEffect(() => {
    void loadBooks();
    void loadSessions();
    const loadVoices = () => {
      try {
        if (typeof window !== 'undefined' && window.speechSynthesis) setVoices(window.speechSynthesis.getVoices());
      } catch (error) { console.error('Voice load failed', error); }
    };
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!timerActive || timerSeconds <= 0) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }
    timerRef.current = window.setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          setTimerActive(false);
          window.alert('Reading session complete. Good.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [timerActive, timerSeconds]);

  useEffect(() => {
    const pageFromChunk = chunks[currentChunk]?.page;
    if (!pageFromChunk) return;
    const normalized = pageFromChunk % 2 === 0 ? Math.max(1, pageFromChunk - 1) : pageFromChunk;
    setCurrentPageNum(normalized);
  }, [currentChunk, chunks]);

  const renderPageToCanvas = useCallback(
    async (pageNum: number, canvas: HTMLCanvasElement | null) => {
      if (!pdfDoc || !canvas || pageNum < 1 || pageNum > pdfDoc.numPages) return;
      const currentRender = ++renderNonceRef.current;
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: pdfScale });
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      context.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      if (currentRender !== renderNonceRef.current) return;
    },
    [pdfDoc, pdfScale]
  );

  useEffect(() => {
    if (!pdfDoc) return;
    void renderPageToCanvas(currentPageNum, leftCanvasRef.current);
    void renderPageToCanvas(currentPageNum + 1, rightCanvasRef.current);
  }, [pdfDoc, currentPageNum, renderPageToCanvas]);

  const loadBooks = async () => {
    try { const data = await pdfBooksAPI.getAll(); setBooks(data); } catch (error) { console.error(error); }
  };

  const loadSessions = async () => {
    try { const data = await readingSessionsAPI.getAll(); setSessions(data); } catch (error) { console.error(error); }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !bookName.trim()) return;
    try {
      await pdfBooksAPI.upload(selectedFile, bookName.trim());
      setSelectedFile(null); setBookName(''); setShowUploadForm(false);
      await loadBooks();
    } catch (error) { console.error(error); window.alert('Upload failed.'); }
  };

  const handleDeleteBook = async (bookId: number, bookName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${bookName}"? This action cannot be undone.`)) return;
    try {
      await pdfBooksAPI.delete(bookId);
      await loadBooks();
      await loadSessions();
    } catch (error) {
      console.error(error);
      window.alert('Failed to delete book.');
    }
  };

  const handleRenameBook = async (bookId: number) => {
    if (!editingBookName.trim()) return;
    try {
      await pdfBooksAPI.update(bookId, { name: editingBookName.trim() });
      setEditingBookId(null);
      setEditingBookName('');
      await loadBooks();
    } catch (error) {
      console.error(error);
      window.alert('Failed to rename book.');
    }
  };

  const startEditingBook = (bookId: number, currentName: string) => {
    setEditingBookId(bookId);
    setEditingBookName(currentName);
  };

  const cancelEditingBook = () => {
    setEditingBookId(null);
    setEditingBookName('');
  };

  const startReading = async (book: PDFBook) => {
    try {
      setIsProcessing(true);
      setLoadingText(`Opening "${book.name}"...`);
      setIsReading(true); setActiveBook(book); setChunks([]);
      
      // Check if audiobook exists for this book
      if ((book as any).audiobook_path) {
        setAudioDownloadUrl(`${API_BASE_URL}/audiobooks/book/${book.id}/download`);
      } else {
        setAudioDownloadUrl(null);
      }
      
      const session = await readingSessionsAPI.create({ book_id: book.id, chunks_read: 0, time_spent: 0 } as ReadingSessionCreate);
      setStoredSession(session); setSessionStartTime(new Date());
      const response = await fetch(`${API_BASE_URL}/pdf-books/${book.id}/download`);
      if (!response.ok) throw new Error('Failed to download PDF');
      const arrayBuffer = await response.arrayBuffer();
      const pdfjsLib = window.pdfjsLib;
      if (!pdfjsLib) throw new Error('PDF.js not loaded');
      setLoadingText('Preparing pages...');
      const loadedPdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(loadedPdfDoc);
      const extractedChunks: Chunk[] = [];
      for (let pageNum = 1; pageNum <= loadedPdfDoc.numPages; pageNum++) {
        setLoadingText(`Indexing page ${pageNum} of ${loadedPdfDoc.numPages}...`);
        const page = await loadedPdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        extractedChunks.push(...extractChunksFromPageText(pageText, pageNum));
      }
      setChunks(extractedChunks);
      const savedChunk = Number((book as any).current_chunk || 0);
      const safeChunk = Math.min(Math.max(savedChunk, 0), Math.max(0, extractedChunks.length - 1));
      const pageFromSavedChunk = extractedChunks[safeChunk]?.page || 1;
      const normalizedPage = pageFromSavedChunk % 2 === 0 ? Math.max(1, pageFromSavedChunk - 1) : pageFromSavedChunk;
      setCurrentChunk(safeChunk); setCurrentSentence(Number((book as any).current_sentence || 0)); setCurrentPageNum(normalizedPage);
      if ((book as any).status !== 'reading') { await pdfBooksAPI.update(book.id, { status: 'reading' }); await loadBooks(); }
    } catch (error: any) {
      console.error(error); window.alert(error?.message || 'Could not open PDF'); await endReadingSession();
    } finally { setIsProcessing(false); }
  };

  const saveProgress = async (newChunk: number, newSentence: number) => {
    if (!activeBook || chunks.length === 0) return;
    try {
      const progressPct = (newChunk / Math.max(chunks.length - 1, 1)) * 100;
      await pdfBooksAPI.update(activeBook.id, { current_chunk: newChunk, current_sentence: newSentence, progress_percentage: progressPct });
      if (storedSession) {
        const previousChunk = Number((activeBook as any).current_chunk || 0);
        const diff = Math.max(0, newChunk - previousChunk);
        if (diff > 0) {
          const updatedRead = (storedSession.chunks_read || 0) + diff;
          await readingSessionsAPI.update(storedSession.id, { chunks_read: updatedRead });
          setStoredSession((prev) => (prev ? { ...prev, chunks_read: updatedRead } : prev));
        }
      }
    } catch (error) { console.error(error); }
  };

  const stopPreviewSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false); setIsPaused(false); utteranceRef.current = null;
  };

  const goToChunk = (newChunk: number, newSentence = 0) => {
    const clamped = Math.max(0, Math.min(newChunk, chunks.length - 1));
    const currentPage = chunks[currentChunk]?.page || 1;
    const nextPage = chunks[clamped]?.page || currentPage;
    setPageAnim(nextPage >= currentPage ? 'forward' : 'backward');
    window.setTimeout(() => setPageAnim('idle'), 600);
    void saveProgress(clamped, newSentence);
    setCurrentChunk(clamped); setCurrentSentence(newSentence);
    if (isSpeaking) stopPreviewSpeech();
  };

  const nextItem = () => {
    if (mode === 'chunk') {
      const next = Math.min(currentChunk + chunksPerRead, chunks.length - 1);
      if (next !== currentChunk) goToChunk(next, 0);
      return;
    }
    const sentences = chunks[currentChunk]?.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [chunks[currentChunk]?.text || ''];
    if (currentSentence + sentencesPerRead < sentences.length) goToChunk(currentChunk, currentSentence + sentencesPerRead);
    else if (currentChunk < chunks.length - 1) goToChunk(currentChunk + 1, 0);
  };

  const prevItem = () => {
    if (mode === 'chunk') {
      const prev = Math.max(currentChunk - chunksPerRead, 0);
      if (prev !== currentChunk) goToChunk(prev, 0);
      return;
    }
    if (currentSentence >= sentencesPerRead) goToChunk(currentChunk, currentSentence - sentencesPerRead);
    else if (currentChunk > 0) {
      const prevText = chunks[currentChunk - 1]?.text || '';
      const prevSentences = prevText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [prevText];
      goToChunk(currentChunk - 1, Math.max(0, prevSentences.length - sentencesPerRead));
    }
  };

  const jumpToPage = () => {
    const page = Number(pageJumpInput);
    if (!page || !pdfDoc) return;
    const chunkIndex = chunks.findIndex((chunk) => chunk.page >= page);
    if (chunkIndex === -1) { window.alert('Page not found.'); return; }
    goToChunk(chunkIndex, 0); setShowPageJump(false); setPageJumpInput('');
  };

  const pickBestPreviewVoice = useCallback(
    (preset: NarratorPreset) => {
      const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
      for (const hint of preset.previewVoiceHints) {
        const matched = englishVoices.find((voice) => voice.name.toLowerCase().includes(hint.toLowerCase()));
        if (matched) return matched;
      }
      return englishVoices[0] || null;
    },
    [voices]
  );

  const currentReadText = useMemo(() => {
    if (chunks.length === 0) return '';
    if (mode === 'chunk') {
      const selected: string[] = [];
      for (let i = 0; i < chunksPerRead && currentChunk + i < chunks.length; i++) selected.push(chunks[currentChunk + i].text);
      return selected.join(' ');
    }
    const sentences = chunks[currentChunk]?.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [chunks[currentChunk]?.text || ''];
    const selected: string[] = [];
    for (let i = 0; i < sentencesPerRead && currentSentence + i < sentences.length; i++) selected.push(sentences[currentSentence + i]);
    return selected.join(' ');
  }, [chunks, currentChunk, currentSentence, chunksPerRead, sentencesPerRead, mode]);

  const readAloud = () => {
    if (!currentReadText.trim() || !window.speechSynthesis) return;
    stopPreviewSpeech();
    const utterance = new SpeechSynthesisUtterance(currentReadText);
    const selectedVoice = pickBestPreviewVoice(selectedNarrator);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = selectedNarrator.previewRate;
    utterance.pitch = selectedNarrator.previewPitch;
    utterance.volume = 1;
    utterance.onstart = () => { setIsSpeaking(true); setIsPaused(false); };
    utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); utteranceRef.current = null; };
    utterance.onerror = () => { setIsSpeaking(false); setIsPaused(false); utteranceRef.current = null; };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const togglePause = () => {
    if (!window.speechSynthesis) return;
    if (isPaused) { window.speechSynthesis.resume(); setIsPaused(false); }
    else { window.speechSynthesis.pause(); setIsPaused(true); }
  };

  const downloadExistingAudiobook = () => {
    if (!audioDownloadUrl || !activeBook) return;
    const a = document.createElement('a');
    // If it's a relative URL, prepend the backend base
    const fullUrl = audioDownloadUrl.startsWith('http') ? audioDownloadUrl : `http://localhost:8000${audioDownloadUrl}`;
    a.href = fullUrl; a.download = `${activeBook.name}.mp3`; a.click();
  };

  const generateAudiobook = async () => {
    if (!activeBook) return;
    try {
      setIsGeneratingAudio(true); setAudioGenProgress(0);

      // Collect all text from chunks to send to backend
      const fullText = chunks.map(chunk => chunk.text).join('\n\n');

      const createRes = await fetch(`${API_BASE_URL}/audiobooks/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: activeBook.id,
          format: 'mp3',
          voice: selectedNarrator.backendVoice,
          style: selectedNarrator.backendStyle,
          narrator_id: selectedNarrator.id,
          text: fullText  // Send extracted text directly
        }),
      });
      if (!createRes.ok) { const text = await createRes.text(); throw new Error(text || 'Failed to start audiobook generation'); }
      const job = await createRes.json();
      const jobId = job.job_id;
      if (!jobId) throw new Error('Missing job id from backend');
      let attempts = 0;
      while (attempts < 240) {
        attempts += 1;
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        const statusRes = await fetch(`${API_BASE_URL}/audiobooks/${jobId}/status`);
        if (!statusRes.ok) { const text = await statusRes.text(); throw new Error(text || 'Failed to read generation status'); }
        const status = await statusRes.json();
        setAudioGenProgress(Number(status.progress || 0));
        if (status.state === 'completed') {
          // Use the book-specific download endpoint
          const bookDownloadUrl = `${API_BASE_URL}/audiobooks/book/${activeBook.id}/download`;
          setAudioDownloadUrl(bookDownloadUrl); 
          setAudioGenProgress(100); 
          setIsGeneratingAudio(false);
          
          // Reload books to get updated audiobook_path
          await loadBooks();
          return;
        }
        if (status.state === 'failed') throw new Error(status.error || 'Audiobook generation failed');
      }
      throw new Error('Audiobook generation timed out');
    } catch (error: any) {
      console.error(error); window.alert(error?.message || 'Audiobook generation failed'); setIsGeneratingAudio(false);
    }
  };

  const endReadingSession = async () => {
    try {
      if (storedSession && sessionStartTime) {
        const timeSpent = Math.max(1, Math.round((Date.now() - sessionStartTime.getTime()) / 60000));
        await readingSessionsAPI.update(storedSession.id, { time_spent: timeSpent });
      }
      if (activeBook && chunks.length > 0 && currentChunk >= chunks.length - 1) await pdfBooksAPI.update(activeBook.id, { status: 'completed' });
    } catch (error) { console.error(error); }
    finally {
      stopPreviewSpeech();
      setIsReading(false); setActiveBook(null); setChunks([]); setStoredSession(null); setSessionStartTime(null);
      setPdfDoc(null); setCurrentPageNum(1); setAudioGenProgress(0); setIsGeneratingAudio(false);
      await loadBooks(); await loadSessions();
    }
  };

  const renderCurrentContent = () => {
    if (chunks.length === 0) return null;
    if (mode === 'chunk') {
      return (
        <div style={{ fontSize: `${fontSize}px`, lineHeight: 1.95, color: '#E2E8F0', fontFamily: "'Georgia', 'Times New Roman', serif" }}>
          {Array.from({ length: chunksPerRead }, (_, i) => chunks[currentChunk + i])
            .filter(Boolean)
            .map((chunk, index) => (
              <p key={chunk.id || index} style={{ marginBottom: '1.2rem', textIndent: '2em', margin: '0 0 1.4rem 0' }}>
                {chunk.text}
              </p>
            ))}
        </div>
      );
    }
    const sentences = chunks[currentChunk]?.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [chunks[currentChunk]?.text || ''];
    return (
      <div style={{ fontSize: `${fontSize}px`, lineHeight: 1.95, color: '#E2E8F0', fontFamily: "'Georgia', 'Times New Roman', serif" }}>
        {sentences.map((sentence, idx) => {
          const active = idx >= currentSentence && idx < currentSentence + sentencesPerRead;
          return (
            <span key={`${idx}-${sentence.slice(0, 16)}`}
              style={{
                background: active ? 'rgba(99,102,241,0.22)' : 'transparent',
                opacity: active ? 1 : 0.42,
                borderRadius: '6px',
                padding: active ? '2px 5px' : '0',
                marginRight: '3px',
                transition: 'all 0.25s ease',
                boxShadow: active ? '0 0 0 1px rgba(99,102,241,0.3)' : 'none',
              }}>
              {sentence.trim()}{' '}
            </span>
          );
        })}
      </div>
    );
  };

  const getBookSessions = (id: number) => sessions.filter((s) => s.book_id === id);
  const getTotalTime = (id: number) => getBookSessions(id).reduce((acc, s) => acc + (s.time_spent || 0), 0);

  const currentPage = chunks[currentChunk]?.page || 1;
  const maxPage = pdfDoc?.numPages || chunks[chunks.length - 1]?.page || 1;
  const progressPct = chunks.length > 0 ? (currentChunk / Math.max(chunks.length - 1, 1)) * 100 : 0;
  const rightPage = Math.min(currentPageNum + 1, maxPage);

  const isAtEnd = currentChunk >= chunks.length - 1 &&
    (mode === 'chunk' || currentSentence >= ((chunks[currentChunk]?.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || ['']).length - 1));
  const isAtStart = currentChunk === 0 && currentSentence === 0;

  return (
    <>
      <style>{`
        :root {
          --bg-root: #0B1020;
          --text-main: #F8FAFC;
          --text-muted: #CBD5E1;
          --text-muted-2: #94A3B8;
          --card-bg: rgba(15, 23, 42, 0.82);
          --border: rgba(255,255,255,0.08);
          --input-bg: rgba(255,255,255,0.05);
          --input-border: rgba(255,255,255,0.12);
          --btn-alt-bg: rgba(255,255,255,0.06);
          --accent: #6366F1;
          --accent-2: #8B5CF6;
          --accent-gradient: linear-gradient(135deg, #6366F1, #8B5CF6);
          --accent-transparent: rgba(99,102,241,0.15);
          --modal-overlay: rgba(0,0,0,0.7);
          --modal-bg: #0F172A;
          --book-text: #E2E8F0;
          --paper: #F7E9CF;
          --ink: #3A2A1A;
        }

        * { box-sizing: border-box; }

        .pdf-root {
          min-height: 100vh;
          background:
            radial-gradient(circle at top, rgba(99,102,241,0.12), transparent 30%),
            linear-gradient(180deg, #0B1020 0%, #0A0F1A 100%);
          padding: 1.5rem 1rem;
          font-family: Inter, system-ui, sans-serif;
        }

        .glass-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          backdrop-filter: blur(18px);
          border-radius: 16px;
        }

        .primary-btn {
          background: var(--accent-gradient);
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.88rem;
          transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
          box-shadow: 0 6px 18px rgba(99,102,241,0.22);
        }
        .primary-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(99,102,241,0.3); }
        .primary-btn:active:not(:disabled) { transform: translateY(0); }
        .primary-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .secondary-btn {
          background: var(--btn-alt-bg);
          border: 1px solid var(--border);
          color: var(--text-muted);
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 500;
          transition: all 0.18s ease;
        }
        .secondary-btn:hover { border-color: rgba(255,255,255,0.18); color: var(--text-main); background: rgba(255,255,255,0.09); }

        .icon-btn {
          background: rgba(255,255,255,0.07);
          border: 1px solid var(--border);
          color: var(--text-muted);
          border-radius: 10px;
          cursor: pointer;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .icon-btn:hover { background: rgba(255,255,255,0.12); color: var(--text-main); }

        .progress-bar {
          background: rgba(255,255,255,0.07);
          border-radius: 999px;
          overflow: hidden;
        }
        .progress-bar > div { background: var(--accent-gradient); height: 100%; transition: width 0.3s ease; border-radius: 999px; }

        /* Book panel */
        .book-panel {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .book-shell {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          background: linear-gradient(135deg, #5B3718 0%, #7A4B24 50%, #4A2A12 100%);
          padding: 14px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.4);
        }

        .book-spread {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          border-radius: 8px;
          overflow: hidden;
          background: #d7bf96;
        }

        .book-page {
          position: relative;
          background: linear-gradient(180deg, var(--paper) 0%, #F0DDB3 100%);
          padding: 8px;
          min-height: 600px;
        }

        .book-page.left { border-right: 1px solid rgba(0,0,0,0.1); box-shadow: inset -12px 0 16px rgba(0,0,0,0.06); }
        .book-page.right { box-shadow: inset 12px 0 16px rgba(0,0,0,0.05); }

        .book-page-num {
          text-align: center;
          color: var(--ink);
          font-size: 0.72rem;
          padding: 4px 0 2px;
          opacity: 0.65;
          font-family: Georgia, serif;
        }

        .book-spine-line {
          position: absolute;
          left: 50%;
          top: 0; bottom: 0;
          width: 14px;
          transform: translateX(-50%);
          background: linear-gradient(90deg, rgba(70,40,15,0.2), rgba(255,255,255,0.08), rgba(70,40,15,0.2));
          pointer-events: none;
          z-index: 3;
        }

        .book-nav-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding: 0.55rem 0 0;
        }

        .book-nav-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid var(--border);
          color: var(--text-muted);
          border-radius: 9px;
          cursor: pointer;
          padding: 0.45rem 0.85rem;
          font-size: 0.82rem;
          font-weight: 600;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .book-nav-btn:hover:not(:disabled) { background: rgba(255,255,255,0.13); color: var(--text-main); }
        .book-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .book-nav-btn.accent { background: var(--accent-gradient); color: white; border-color: transparent; box-shadow: 0 4px 12px rgba(99,102,241,0.25); }
        .book-nav-btn.accent:hover { box-shadow: 0 6px 16px rgba(99,102,241,0.35); transform: translateY(-1px); }

        /* Reading text panel */
        .reading-panel {
          display: flex;
          flex-direction: column;
          gap: 0;
          min-height: 0;
        }

        .reading-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1.1rem;
          border-bottom: 1px solid var(--border);
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .reading-body {
          flex: 1;
          padding: 2rem 2.4rem;
          overflow-y: auto;
          min-height: 220px;
          max-height: 420px;
          scroll-behavior: smooth;
        }

        .reading-body::-webkit-scrollbar { width: 5px; }
        .reading-body::-webkit-scrollbar-track { background: transparent; }
        .reading-body::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 4px; }

        .reading-footer {
          border-top: 1px solid var(--border);
          padding: 0.75rem 1.1rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .book-page-forward { animation: pageFwd 0.55s ease-in-out; }
        .book-page-backward { animation: pageBwd 0.55s ease-in-out; }
        @keyframes pageFwd {
          0% { transform: perspective(2000px) rotateY(0deg); opacity: 1; }
          35% { transform: perspective(2000px) rotateY(-8deg) scale(0.992); opacity: 0.92; }
          100% { transform: perspective(2000px) rotateY(0deg); opacity: 1; }
        }
        @keyframes pageBwd {
          0% { transform: perspective(2000px) rotateY(0deg); opacity: 1; }
          35% { transform: perspective(2000px) rotateY(8deg) scale(0.992); opacity: 0.92; }
          100% { transform: perspective(2000px) rotateY(0deg); opacity: 1; }
        }

        .page-canvas { width: 100%; height: auto; display: block; background: white; }

        .loading-spinner {
          width: 48px; height: 48px;
          border-radius: 999px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: var(--accent);
          animation: spin 0.85s linear infinite;
          margin: 0 auto 1rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .download-banner {
          background: linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.12) 50%, rgba(16,185,129,0.1) 100%);
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 16px;
          padding: 1.2rem 1.4rem;
          margin-bottom: 0.85rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          animation: bannerSlideIn 0.5s ease-out;
          position: relative;
          overflow: hidden;
        }
        .download-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.05) 50%, transparent 100%);
          animation: bannerShimmer 3s ease-in-out infinite;
        }
        @keyframes bannerSlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bannerShimmer {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        .download-btn {
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.92rem;
          padding: 0.75rem 1.5rem;
          transition: all 0.2s ease;
          box-shadow: 0 6px 20px rgba(16,185,129,0.3);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
          position: relative;
          z-index: 1;
        }
        .download-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(16,185,129,0.4);
        }
        .download-btn:active {
          transform: translateY(0);
        }
        .download-btn-icon {
          display: inline-block;
          animation: downloadBounce 1.5s ease-in-out infinite;
        }
        @keyframes downloadBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }

        .settings-panel {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.1rem;
        }

        .narrator-card {
          cursor: pointer;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 0.72rem 0.9rem;
          transition: all 0.18s ease;
          background: rgba(255,255,255,0.03);
        }
        .narrator-card:hover { transform: translateY(-1px); border-color: rgba(255,255,255,0.14); }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.28rem 0.7rem;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 600;
          letter-spacing: 0.04em;
        }

        .toggle-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 3px;
        }
        .toggle-row button {
          flex: 1;
          padding: 0.46rem 0.7rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 600;
          transition: all 0.15s ease;
          color: var(--text-muted);
          background: transparent;
        }
        .toggle-row button.active {
          background: var(--accent-gradient);
          color: white;
          box-shadow: 0 2px 8px rgba(99,102,241,0.3);
        }

        .two-col {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        @media (max-width: 860px) {
          .two-col { flex-direction: column; }
          .book-spread { grid-template-columns: 1fr; }
          .book-page.right { display: none; }
          .book-spine-line { display: none; }
        }
      `}</style>

      <div className="pdf-root">

        {/* ─── Header ─── */}
        <div style={{ textAlign: 'center', marginBottom: '1.6rem' }}>
          <div style={{ color: '#A5B4FC', fontSize: '0.72rem', letterSpacing: '0.32em', marginBottom: '0.45rem', fontWeight: 700 }}>
            IMMERSIVE READER
          </div>
          <h1 style={{ color: 'var(--text-main)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', margin: 0, fontWeight: 900, letterSpacing: '-0.02em' }}>
            📚 Human-like PDF Audiobook Reader
          </h1>
        </div>

        {/* ─── Library view ─── */}
        {!isReading ? (
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.4rem', textAlign: 'center' }}>
              {!showUploadForm ? (
                <>
                  <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>📤</div>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', margin: '0 0 1rem 0' }}>Upload a PDF and turn it into a real reading + audiobook flow.</p>
                  <button className="primary-btn" style={{ padding: '0.82rem 1.4rem' }} onClick={() => setShowUploadForm(true)}>
                    Upload Book
                  </button>
                </>
              ) : (
                <div style={{ maxWidth: 400, margin: '0 auto', textAlign: 'left' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Book title</label>
                    <input value={bookName} onChange={(e) => setBookName(e.target.value)} required
                      style={{ width: '100%', padding: '0.72rem 0.9rem', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', outline: 'none' }} />
                  </div>
                  <div style={{ marginBottom: '1.1rem' }}>
                    <label style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>PDF file</label>
                    <input type="file" accept=".pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} required style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.7rem' }}>
                    <button className="primary-btn" onClick={handleFileUpload as any} style={{ flex: 1, padding: '0.78rem 1rem' }}>Add book</button>
                    <button className="secondary-btn" onClick={() => setShowUploadForm(false)} style={{ flex: 1, padding: '0.78rem 1rem' }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1.1rem' }}>
              {books.map((book) => {
                const totalTime = getTotalTime(book.id);
                const sessionsCount = getBookSessions(book.id).length;
                const isEditing = editingBookId === book.id;
                const hasAudiobook = !!(book as any).audiobook_path;

                return (
                  <div key={book.id} className="glass-card" style={{ overflow: 'hidden' }}>
                    <div style={{ height: 5, background: 'var(--accent-gradient)' }} />
                    <div style={{ padding: '1.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem' }}>
                        <div style={{ fontSize: '1.8rem' }}>{(book as any).status === 'completed' ? '✅' : '📘'}</div>
                        {hasAudiobook && (
                          <div 
                            style={{ 
                              fontSize: '0.7rem', 
                              padding: '0.3rem 0.6rem', 
                              background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))',
                              border: '1px solid rgba(16,185,129,0.3)',
                              borderRadius: '6px',
                              color: '#10B981',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                            title="Audiobook available"
                          >
                            🎧 Audio
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div style={{ marginBottom: '0.9rem' }}>
                          <input
                            type="text"
                            value={editingBookName}
                            onChange={(e) => setEditingBookName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameBook(book.id);
                              if (e.key === 'Escape') cancelEditingBook();
                            }}
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: 8,
                              border: '1px solid var(--input-border)',
                              background: 'var(--input-bg)',
                              color: 'var(--text-main)',
                              fontSize: '1rem',
                              marginBottom: '0.5rem',
                              outline: 'none'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="primary-btn"
                              style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => handleRenameBook(book.id)}
                            >
                              Save
                            </button>
                            <button
                              className="secondary-btn"
                              style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={cancelEditingBook}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 style={{ color: 'var(--text-main)', margin: '0 0 0.2rem 0', fontSize: '1rem' }}>{book.name}</h3>
                          <p style={{ color: 'var(--text-muted-2)', fontSize: '0.76rem', margin: '0 0 0.9rem 0' }}>{book.original_filename}</p>
                        </>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                        <span>{Number((book as any).progress_percentage || 0).toFixed(0)}% read</span>
                        <span>{totalTime}m · {sessionsCount} sessions</span>
                      </div>
                      <div className="progress-bar" style={{ height: 6, marginBottom: '0.9rem' }}>
                        <div style={{ width: `${Number((book as any).progress_percentage || 0)}%` }} />
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="primary-btn" style={{ flex: 1, padding: '0.75rem 1rem' }} onClick={() => void startReading(book)}>
                          {(book as any).current_chunk ? 'Continue reading' : 'Start reading'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                        <button
                          className="secondary-btn"
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                          onClick={() => startEditingBook(book.id, book.name)}
                        >
                          ✏️ Rename
                        </button>
                        <button
                          className="secondary-btn"
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          onClick={() => handleDeleteBook(book.id, book.name)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {books.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted-2)', paddingTop: '2.5rem' }}>No books yet. Upload one above!</div>
            )}
          </div>

        ) : (
          /* ─── Reading view ─── */
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {isProcessing ? (
              <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div className="loading-spinner" />
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>{loadingText}</p>
              </div>
            ) : (
              <>
                {/* Top bar */}
                <div className="glass-card" style={{ padding: '0.85rem 1.1rem', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                      <button className="secondary-btn" style={{ padding: '0.5rem 0.85rem', whiteSpace: 'nowrap' }} onClick={() => void endReadingSession()}>
                        ← Library
                      </button>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: 'var(--text-muted-2)', fontSize: '0.76rem' }}>
                          Page {currentPageNum} · Chunk {currentChunk + 1}/{chunks.length} · {progressPct.toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', flexShrink: 0 }}>
                      {timerActive ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.9rem', background: 'var(--accent-transparent)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)' }}>
                          <span style={{ fontSize: '0.72rem' }}>⏱</span>
                          <span style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>
                            {Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, '0')}
                          </span>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem' }} onClick={() => setTimerActive(false)}>✕</button>
                        </div>
                      ) : (
                        <button className="secondary-btn" style={{ padding: '0.5rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                          onClick={() => { setTimerSeconds(timerDuration * 60); setTimerActive(true); }}>
                          ⏱ {timerDuration}m
                        </button>
                      )}
                      <button className="secondary-btn" style={{ padding: '0.5rem 0.85rem' }} onClick={() => setShowPageJump(true)}>Go to page</button>
                      <button className={`secondary-btn ${showSettings ? 'active' : ''}`}
                        style={{ padding: '0.5rem 0.85rem', borderColor: showSettings ? 'rgba(99,102,241,0.5)' : undefined, color: showSettings ? '#A5B4FC' : undefined }}
                        onClick={() => setShowSettings((v) => !v)}>
                        ⚙ Settings
                      </button>
                    </div>
                  </div>

                  <div className="progress-bar" style={{ height: 5, marginTop: '0.75rem' }}>
                    <div style={{ width: `${progressPct}%` }} />
                  </div>
                </div>

                {/* ─── Download Banner (shown after generation completes) ─── */}
                {audioDownloadUrl && !isGeneratingAudio && (
                  <div className="download-banner">
                    <div style={{ fontSize: '2rem', flexShrink: 0, position: 'relative', zIndex: 1 }}>🎧</div>
                    <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                        Audiobook Ready!
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 600, color: '#A5B4FC' }}>{activeBook?.name}</span>
                        {' · '}
                        Narrated by {selectedNarrator.emoji} {selectedNarrator.name}
                      </div>
                    </div>
                    <button className="download-btn" onClick={downloadExistingAudiobook}>
                      <span className="download-btn-icon">⬇</span> Download MP3
                    </button>
                    <button
                      className="secondary-btn"
                      style={{ padding: '0.6rem 0.9rem', fontSize: '0.8rem', position: 'relative', zIndex: 1 }}
                      onClick={() => setAudioDownloadUrl(null)}
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* ─── Audio Generation Progress Banner ─── */}
                {isGeneratingAudio && (
                  <div className="download-banner" style={{ borderColor: 'rgba(139,92,246,0.3)' }}>
                    <div style={{ fontSize: '2rem', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                      <span style={{ display: 'inline-block', animation: 'spin 2s linear infinite' }}>🎵</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '0.45rem' }}>
                        Generating Audiobook...
                      </div>
                      <div className="progress-bar" style={{ height: 8, marginBottom: '0.3rem' }}>
                        <div style={{ width: `${audioGenProgress}%` }} />
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {audioGenProgress}% · {selectedNarrator.emoji} {selectedNarrator.name} voice
                      </div>
                    </div>
                  </div>
                )}

                {/* Settings panel (collapsible) */}
                {showSettings && (
                  <div className="glass-card" style={{ padding: '1.1rem', marginBottom: '0.85rem' }}>
                    <div className="settings-panel">
                      {/* Read mode */}
                      <div>
                        <div style={{ color: 'var(--text-muted-2)', fontSize: '0.72rem', letterSpacing: '0.14em', fontWeight: 700, marginBottom: '0.6rem' }}>READ MODE</div>
                        <div className="toggle-row" style={{ marginBottom: '0.7rem' }}>
                          {(['chunk', 'sentence'] as const).map((item) => (
                            <button key={item} className={mode === item ? 'active' : ''} onClick={() => setMode(item)}>
                              {item === 'chunk' ? 'Chunks' : 'Sentences'}
                            </button>
                          ))}
                        </div>
                        <div style={{ color: 'var(--text-muted-2)', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                          {mode === 'chunk' ? `${chunksPerRead} chunk${chunksPerRead > 1 ? 's' : ''} per step` : `${sentencesPerRead} sentence${sentencesPerRead > 1 ? 's' : ''} per step`}
                        </div>
                        <input type="range" min="1" max="10"
                          value={mode === 'chunk' ? chunksPerRead : sentencesPerRead}
                          onChange={(e) => mode === 'chunk' ? setChunksPerRead(Number(e.target.value)) : setSentencesPerRead(Number(e.target.value))}
                          style={{ width: '100%', accentColor: '#8B5CF6' }} />
                      </div>

                      {/* Font / PDF scale */}
                      <div>
                        <div style={{ color: 'var(--text-muted-2)', fontSize: '0.72rem', letterSpacing: '0.14em', fontWeight: 700, marginBottom: '0.6rem' }}>DISPLAY</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                          <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setFontSize((v) => Math.max(12, v - 2))}>A-</button>
                          <span style={{ color: 'var(--text-main)', minWidth: 28, textAlign: 'center', fontSize: '0.9rem' }}>{fontSize}</span>
                          <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setFontSize((v) => Math.min(34, v + 2))}>A+</button>
                          <span style={{ color: 'var(--text-muted-2)', fontSize: '0.78rem', marginLeft: 4 }}>text size</span>
                        </div>
                        <div style={{ color: 'var(--text-muted-2)', fontSize: '0.78rem', marginBottom: '0.3rem' }}>PDF zoom: {pdfScale.toFixed(2)}×</div>
                        <input type="range" min="0.7" max="1.8" step="0.05" value={pdfScale} onChange={(e) => setPdfScale(Number(e.target.value))} style={{ width: '100%', accentColor: '#6366F1' }} />
                      </div>

                      {/* Timer */}
                      <div>
                        <div style={{ color: 'var(--text-muted-2)', fontSize: '0.72rem', letterSpacing: '0.14em', fontWeight: 700, marginBottom: '0.6rem' }}>FOCUS TIMER</div>
                        <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
                          <input type="number" min="1" max="120" value={timerDuration} onChange={(e) => setTimerDuration(Number(e.target.value) || 1)}
                            style={{ width: 64, padding: '0.55rem 0.65rem', borderRadius: 9, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.9rem' }} />
                          <span style={{ color: 'var(--text-muted-2)', fontSize: '0.82rem' }}>min</span>
                          <button className="primary-btn" style={{ padding: '0.55rem 0.9rem' }} onClick={() => { setTimerSeconds(timerDuration * 60); setTimerActive(true); setShowSettings(false); }}>Start</button>
                        </div>
                      </div>

                      {/* Voice */}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ color: 'var(--text-muted-2)', fontSize: '0.72rem', letterSpacing: '0.14em', fontWeight: 700, marginBottom: '0.6rem' }}>VOICE NARRATOR</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.8rem' }}>
                          {NARRATORS.map((narrator) => {
                            const active = selectedNarrator.id === narrator.id;
                            return (
                              <button key={narrator.id} className="narrator-card" onClick={() => setSelectedNarrator(narrator)}
                                style={{ background: active ? hexToRgba(narrator.color, 0.16) : 'rgba(255,255,255,0.03)', borderColor: active ? narrator.color : 'rgba(255,255,255,0.08)', color: 'var(--text-main)', textAlign: 'left' }}>
                                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                  <span style={{ fontSize: '1.2rem' }}>{narrator.emoji}</span>
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{narrator.name}</div>
                                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{narrator.desc}</div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', alignItems: 'center' }}>
                          {!isSpeaking ? (
                            <button className="primary-btn" style={{ padding: '0.6rem 1rem' }} onClick={readAloud}>▶ Preview voice</button>
                          ) : (
                            <>
                              <button className="primary-btn" style={{ padding: '0.6rem 1rem' }} onClick={togglePause}>{isPaused ? '▶ Resume' : '⏸ Pause'}</button>
                              <button className="secondary-btn" style={{ padding: '0.6rem 1rem' }} onClick={stopPreviewSpeech}>■ Stop</button>
                            </>
                          )}
                          {!isGeneratingAudio ? (
                            <button className="primary-btn" style={{ padding: '0.6rem 1rem', marginLeft: 'auto' }} onClick={() => void generateAudiobook()}>
                              🎧 Generate MP3
                            </button>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginLeft: 'auto' }}>
                              <div className="progress-bar" style={{ width: 140, height: 8 }}><div style={{ width: `${audioGenProgress}%` }} /></div>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{audioGenProgress}%</span>
                            </div>
                          )}
                          {audioDownloadUrl && !isGeneratingAudio && (
                            <button className="secondary-btn" style={{ padding: '0.6rem 1rem' }} onClick={downloadExistingAudiobook}>⬇ MP3</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── Main reading area: two-col (book LEFT, text RIGHT) ─── */}
                <div className="two-col">


                  {/* RIGHT: Readable text — the main focus */}
                  <div className="glass-card reading-panel" style={{ overflow: 'hidden' }}>
                    <div className="reading-header">
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>Current Text</div>
                        <div style={{ color: 'var(--text-muted-2)', fontSize: '0.75rem', marginTop: '0.1rem' }}>
                          Source: page {currentPage} · {mode === 'chunk' ? `${chunksPerRead} chunk${chunksPerRead > 1 ? 's' : ''}` : `${sentencesPerRead} sentence${sentencesPerRead > 1 ? 's' : ''}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                        <div className="toggle-row" style={{ padding: '2px' }}>
                          {(['chunk', 'sentence'] as const).map((item) => (
                            <button key={item} className={mode === item ? 'active' : ''} onClick={() => setMode(item)} style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem' }}>
                              {item === 'chunk' ? 'Chunks' : 'Sentences'}
                            </button>
                          ))}
                        </div>
                        <button className="icon-btn" style={{ width: 32, height: 32, fontSize: '0.85rem' }} onClick={() => setFontSize((v) => Math.max(12, v - 2))}>A-</button>
                        <button className="icon-btn" style={{ width: 32, height: 32, fontSize: '0.85rem' }} onClick={() => setFontSize((v) => Math.min(34, v + 2))}>A+</button>
                        {!isSpeaking ? (
                          <button className="primary-btn" style={{ padding: '0.38rem 0.8rem', fontSize: '0.8rem' }} onClick={readAloud}>▶</button>
                        ) : (
                          <button className="primary-btn" style={{ padding: '0.38rem 0.8rem', fontSize: '0.8rem' }} onClick={togglePause}>{isPaused ? '▶' : '⏸'}</button>
                        )}
                      </div>
                    </div>

                    <div className="reading-body">
                      {renderCurrentContent()}
                    </div>

                    <div className="reading-footer">
                      <button className="primary-btn" style={{ padding: '0.62rem 1.2rem' }} onClick={prevItem} disabled={isAtStart}>← Previous</button>
                      <div style={{ flex: 1 }}>
                        <div className="progress-bar" style={{ height: 6 }}>
                          <div style={{ width: `${progressPct}%` }} />
                        </div>
                        <div style={{ color: 'var(--text-muted-2)', fontSize: '0.72rem', marginTop: '0.3rem', textAlign: 'center' }}>
                          {progressPct.toFixed(1)}% complete
                        </div>
                      </div>
                      <button className="primary-btn" style={{ padding: '0.62rem 1.2rem' }} onClick={nextItem} disabled={isAtEnd}>Next →</button>
                    </div>
                  </div>
                </div>



                {/* LEFT: Large book view + page nav */}
                <div className="book-panel">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted-2)', fontSize: '0.76rem', fontWeight: 600, letterSpacing: '0.1em' }}>PDF VIEW</span>
                    <button className="secondary-btn" style={{ padding: '0.28rem 0.7rem', fontSize: '0.76rem' }} onClick={() => setShowPdfView((v) => !v)}>
                      {showPdfView ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  {showPdfView && (
                    <div className={`book-shell ${pageAnim === 'forward' ? 'book-page-forward' : pageAnim === 'backward' ? 'book-page-backward' : ''}`}>
                      <div className="book-spine-line" />
                      <div className="book-spread">
                        <div className="book-page left">
                          <canvas ref={leftCanvasRef} className="page-canvas" />
                          <div className="book-page-num">{currentPageNum}</div>
                        </div>
                        <div className="book-page right">
                          <canvas ref={rightCanvasRef} className="page-canvas" />
                          <div className="book-page-num">{rightPage}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Page navigation right below book */}
                  <div className="book-nav-row" style={{ padding: '0.7rem 0 0' }}>
                    <button className="book-nav-btn" style={{ padding: '0.6rem 1.4rem', fontSize: '0.9rem' }} onClick={prevItem} disabled={isAtStart}>← Prev</button>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 700 }}>
                        {currentChunk + 1} <span style={{ color: 'var(--text-muted-2)', fontWeight: 400 }}>/ {chunks.length}</span>
                      </div>
                      <div style={{ color: 'var(--text-muted-2)', fontSize: '0.72rem' }}>chunk position</div>
                    </div>
                    <button className="book-nav-btn accent" style={{ padding: '0.6rem 1.4rem', fontSize: '0.9rem' }} onClick={nextItem} disabled={isAtEnd}>Next →</button>
                  </div>

                  {/* Quick page jump */}
                  <div style={{ marginTop: '0.55rem', display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                    <div style={{ color: 'var(--text-muted-2)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Pg {currentPageNum}/{maxPage}</div>
                    <div style={{ flex: 1 }}>
                      <div className="progress-bar" style={{ height: 4 }}>
                        <div style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                    <button className="secondary-btn" style={{ padding: '0.28rem 0.6rem', fontSize: '0.73rem' }} onClick={() => setShowPageJump(true)}>↗</button>
                  </div>
                </div>
              </>



            )}
          </div>
        )}

        {/* Page jump modal */}
        {showPageJump && (
          <div onClick={() => setShowPageJump(false)}
            style={{ position: 'fixed', inset: 0, background: 'var(--modal-overlay)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
            <div className="glass-card" onClick={(e) => e.stopPropagation()}
              style={{ width: 320, padding: '1.4rem', background: 'var(--modal-bg)' }}>
              <h3 style={{ marginTop: 0, color: 'var(--text-main)', fontSize: '1rem' }}>Jump to page</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>Enter a page between 1 and {maxPage}.</p>
              <input type="number" min="1" max={maxPage} value={pageJumpInput}
                onChange={(e) => setPageJumpInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && jumpToPage()}
                autoFocus
                style={{ width: '100%', padding: '0.78rem 0.9rem', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '0.9rem' }} />
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button className="primary-btn" style={{ flex: 1, padding: '0.75rem 1rem' }} onClick={jumpToPage}>Go</button>
                <button className="secondary-btn" style={{ flex: 1, padding: '0.75rem 1rem' }} onClick={() => setShowPageJump(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PDFReader;