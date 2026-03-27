"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic, 
  Video, 
  Upload, 
  Play, 
  Pause, 
  Square, 
  Trash2, 
  Star, 
  Music, 
  Download,
  ChevronRight,
  ChevronLeft,
  Settings,
  History,
  LayoutGrid,
  Search,
  Plus,
  X,
  Check,
  ExternalLink,
  Link as LinkIcon,
  Volume2,
  Sliders,
  HelpCircle,
  Info,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Toaster, toast } from 'sonner';
import WaveSurfer from 'wavesurfer.js';

// 这里的路径引用必须根据你的新结构对齐
import { cn } from '../lib/utils';
import { Work, UserProfile } from './types';
import { useStudioEngine } from '../hooks/useStudioEngine';
import { Language, translations } from './translations';
import { saveBlob, getBlob, deleteBlob } from '../lib/db';

// --- Components ---

const AudioVisualizer = ({ 
  url, 
  vocalVolume = 1,
  backingVolume = 1,
  className, 
  lang,
  mediaRef
}: { 
  url: string | null; 
  vocalVolume?: number;
  backingVolume?: number;
  className?: string; 
  lang: Language;
  mediaRef?: React.RefObject<HTMLMediaElement | null>;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const t = translations[lang];

  useEffect(() => {
    if (!containerRef.current || !url) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4f46e5',
      progressColor: '#818cf8',
      barWidth: 2,
      height: 60,
      media: mediaRef?.current || undefined,
    });

    ws.on('ready', () => setIsLoading(false));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    
    ws.load(url);
    wavesurferRef.current = ws;

    return () => ws.destroy();
  }, [url, mediaRef]);

  return (
    <div className={cn("flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10", className)}>
      <button 
        onClick={() => wavesurferRef.current?.playPause()}
        className="w-10 h-10 flex items-center justify-center bg-indigo-600 rounded-full shrink-0"
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
      </button>
      <div ref={containerRef} className="flex-1" />
    </div>
  );
};

const WorkCard = ({ work, onDelete, onToggleFeatured, onUpdate, lang }: any) => {
  const t = translations[lang as Language];
  return (
    <motion.div layout className="glass rounded-2xl p-5 mb-4">
      <div className="flex justify-between mb-4">
        <div>
          <span className="text-[10px] text-indigo-400 uppercase font-mono">{work.songCategory}</span>
          <h3 className="text-lg font-semibold text-white">{work.title}</h3>
        </div>
        <div className="flex gap-2">
            <button onClick={() => onToggleFeatured(work.id)} className={cn("p-2 rounded-lg", work.isFeatured ? "text-yellow-400" : "text-white/40")}>
                <Star size={16} fill={work.isFeatured ? "currentColor" : "none"} />
            </button>
            <button onClick={() => onDelete(work.id)} className="p-2 text-white/40 hover:text-red-400">
                <Trash2 size={16} />
            </button>
        </div>
      </div>
      {work.mediaType === 'video' ? (
        <video src={work.fileUrl} controls className="w-full rounded-xl bg-black mb-4" />
      ) : (
        <AudioVisualizer url={work.fileUrl} lang={lang} />
      )}
    </motion.div>
  );
};

// --- Main App Page ---

export default function Page() {
  const [works, setWorks] = useState<Work[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    name: "Artist Name", bio: "Practice Journey", avatarUrl: "", bannerUrl: ""
  });
  
  const [recordingType, setRecordingType] = useState<'audio' | 'video'>('audio');
  const [showRecorder, setShowRecorder] = useState(false);
  const [backingTrackUrl, setBackingTrackUrl] = useState('');
  const [language, setLanguage] = useState<Language>('zh');

  const studio = useStudioEngine();
  const t = translations[language];
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const startRecording = async () => {
    await studio.startRecording(recordingType);
    if (recordingType === 'video' && videoPreviewRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoPreviewRef.current.srcObject = stream;
    }
  };

  const stopRecording = async () => {
    const result = await studio.stopRecording();
    if (result) {
      const newWork: Work = {
        id: crypto.randomUUID(),
        title: `${t.studioSession} ${new Date().toLocaleTimeString()}`,
        songCategory: t.studioSessions,
        fileUrl: URL.createObjectURL(result.mixed),
        mediaType: recordingType,
        isFeatured: false,
        createdAt: Date.now(),
      };
      setWorks(prev => [newWork, ...prev]);
    }
    setShowRecorder(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <Toaster position="top-center" theme="dark" />
      
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="text-indigo-500" /> Vocal Studio
          </h1>
          <p className="text-[10px] text-white/40 uppercase tracking-widest">{t.proVocalEngine}</p>
        </div>
        <button 
            onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
            className="px-4 py-2 glass rounded-full text-xs font-bold"
        >
            {language === 'en' ? '中文' : 'EN'}
        </button>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold">{t.yourLibrary}</h2>
          <div className="flex gap-3">
            <button onClick={() => { setRecordingType('audio'); setShowRecorder(true); }} className="p-3 bg-indigo-600 rounded-full"><Mic size={20}/></button>
            <button onClick={() => { setRecordingType('video'); setShowRecorder(true); }} className="p-3 bg-white/10 rounded-full"><Video size={20}/></button>
          </div>
        </div>

        <div className="space-y-4">
          {works.map(work => (
            <WorkCard key={work.id} work={work} lang={language} onDelete={(id:any) => setWorks(works.filter(w=>w.id!==id))} onToggleFeatured={(id:any)=>setWorks(works.map(w=>w.id===id?{...w,isFeatured:!w.isFeatured}:w))} />
          ))}
          {works.length === 0 && (
            <div className="text-center py-20 opacity-20">
              <Music size={48} className="mx-auto mb-4" />
              <p>{t.noWorksFound}</p>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {showRecorder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black flex items-center justify-center p-6">
            <div className="w-full max-w-md flex flex-col items-center">
              <button onClick={() => setShowRecorder(false)} className="absolute top-10 right-10 text-white/40"><X size={32}/></button>
              
              <div className="text-indigo-400 font-mono text-[10px] mb-10 uppercase tracking-widest">{t.studioMode}</div>
              
              <div className="w-full aspect-video bg-white/5 rounded-3xl mb-10 overflow-hidden flex items-center justify-center border border-white/10">
                {recordingType === 'video' ? <video ref={videoPreviewRef} autoPlay muted className="w-full h-full object-cover" /> : <div className="animate-pulse text-indigo-500"><Mic size={48}/></div>}
              </div>

              <div className="text-5xl font-mono mb-10">{formatTime(studio.recordingTime)}</div>

              {!studio.isRecording ? (
                <button onClick={startRecording} className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center"><div className="w-8 h-8 bg-white rounded-full"/></button>
              ) : (
                <button onClick={stopRecording} className="w-20 h-20 bg-white rounded-full flex items-center justify-center"><Square size={32} className="text-black fill-black"/></button>
              )}
              
              <p className="mt-8 text-white/40 text-sm">{studio.isRecording ? t.stopRecordingPrompt : t.startRecordingPrompt}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
