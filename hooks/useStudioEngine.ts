import { useState, useRef, useCallback } from 'react';

export const useStudioEngine = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [micVolume, setMicVolume] = useState(1);
  const [backingTrackVolume, setBackingTrackVolume] = useState(0.5);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const backingTrackBufferRef = useRef<AudioBuffer | null>(null);
  const timerRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 加载伴奏流
  const loadBackingTrack = async (url: string) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      backingTrackBufferRef.current = await audioContextRef.current.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.error("加载伴奏失败", e);
    }
  };

  const startRecording = async (type: 'audio' | 'video') => {
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
    
    // 这里是核心：创建混音图
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    const dest = ctx.createMediaStreamDestination();
    
    // 接入麦克风并调节音量
    const micSource = ctx.createMediaStreamSource(stream);
    const micGain = ctx.createGain();
    micGain.gain.value = micVolume;
    micSource.connect(micGain).connect(dest);

    // 如果有伴奏，接入伴奏并调节音量
    if (backingTrackBufferRef.current) {
      const bSource = ctx.createBufferSource();
      bSource.buffer = backingTrackBufferRef.current;
      const bGain = ctx.createGain();
      bGain.gain.value = backingTrackVolume;
      bSource.connect(bGain).connect(dest);
      bSource.start(0);
    }

    const combinedStream = type === 'video' 
      ? new MediaStream([...stream.getVideoTracks(), ...dest.stream.getAudioTracks()])
      : dest.stream;

    const recorder = new MediaRecorder(combinedStream);
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.start();
    
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
  };

  const stopRecording = async () => {
    setIsRecording(false);
    clearInterval(timerRef.current);
    setIsProcessing(true);
    setProcessingProgress(20);

    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) return resolve(null);
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
        setProcessingProgress(100);
        setTimeout(() => {
          setIsProcessing(false);
          resolve({ mixed: blob, vocal: blob }); // 简化版返回
        }, 500);
      };
      mediaRecorderRef.current.stop();
    });
  };

  return {
    isRecording, recordingTime, isProcessing, processingProgress,
    micVolume, setMicVolume, backingTrackVolume, setBackingTrackVolume,
    startRecording, stopRecording, loadBackingTrack,
    backingTrackBuffer: backingTrackBufferRef.current,
    loadBackingTrackFromFile: (file: File) => {} // 简化的占位
  };
};
