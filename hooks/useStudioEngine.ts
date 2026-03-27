import { useState, useRef, useEffect } from 'react';

export const useStudioEngine = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [micVolume, setMicVolume] = useState(1);
  const [backingTrackVolume, setBackingTrackVolume] = useState(0.5);
  const [backingTrackBuffer, setBackingTrackBuffer] = useState<AudioBuffer | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // 加载伴奏
  const loadBackingTrack = async (url: string) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      setBackingTrackBuffer(buffer);
      audioContextRef.current = ctx;
    } catch (e) {
      console.error("Backing track load failed", e);
    }
  };

  const startRecording = async (type: 'audio' | 'video') => {
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: { echoCancellation: true, noiseSuppression: true }, 
      video: type === 'video' 
    });
    streamRef.current = stream;

    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    const dest = ctx.createMediaStreamDestination();

    // 麦克风输入
    const micSource = ctx.createMediaStreamSource(stream);
    const micGain = ctx.createGain();
    micGain.gain.value = micVolume;
    micSource.connect(micGain).connect(dest);

    // 伴奏输入
    if (backingTrackBuffer) {
      const bSource = ctx.createBufferSource();
      bSource.buffer = backingTrackBuffer;
      const bGain = ctx.createGain();
      bGain.gain.value = backingTrackVolume;
      bSource.connect(bGain).connect(dest);
      bSource.start(0);
    }

    // 合成流
    const combinedStream = type === 'video' 
      ? new MediaStream([...stream.getVideoTracks(), ...dest.stream.getAudioTracks()])
      : dest.stream;

    const recorder = new MediaRecorder(combinedStream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
  };

  const stopRecording = async () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) return resolve(null);
      
      setIsProcessing(true);
      setProcessingProgress(30);

      mediaRecorderRef.current.onstop = () => {
        const type = mediaRecorderRef.current?.mimeType.includes('video') ? 'video/mp4' : 'audio/wav';
        const blob = new Blob(chunksRef.current, { type });
        setProcessingProgress(100);
        setTimeout(() => {
          setIsProcessing(false);
          setIsRecording(false);
          clearInterval(timerRef.current);
          streamRef.current?.getTracks().forEach(t => t.stop());
          resolve({ mixed: blob, vocal: blob }); 
        }, 500);
      };

      mediaRecorderRef.current.stop();
    });
  };

  return {
    isRecording, recordingTime, isProcessing, processingProgress,
    micVolume, setMicVolume, backingTrackVolume, setBackingTrackVolume,
    startRecording, stopRecording, loadBackingTrack,
    backingTrackBuffer,
    loadBackingTrackFromFile: (file: File) => {
      const url = URL.createObjectURL(file);
      loadBackingTrack(url);
    }
  };
};


onst stopRecording = (): Promise<{ mixed: Blob; vocal: Blob } | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !micRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      setIsProcessing(true);
      setProcessingProgress(10);

      const recorder = mediaRecorderRef.current;
      const micRecorder = micRecorderRef.current;
      const mimeType = recorder.mimeType;

      recorder.onstop = async () => {
        setProcessingProgress(60);
        await new Promise(r => setTimeout(r, 200));
        
        const mixedBlob = new Blob(chunksRef.current, { type: mimeType });
        const vocalBlob = new Blob(micChunksRef.current, { type: micRecorder.mimeType });
        
        setProcessingProgress(100);

        if (mixedBlob.size < 500) {
          toast.error("Recording failed: No data captured.");
          setIsProcessing(false);
          resolve(null);
          return;
        }
        
        // Cleanup
        if (backingTrackSourceRef.current) {
          try { backingTrackSourceRef.current.stop(); } catch (e) {}
          backingTrackSourceRef.current = null;
        }
        if (micSourceRef.current) {
          micSourceRef.current.disconnect();
          micSourceRef.current = null;
        }
        if (timerRef.current) clearInterval(timerRef.current);
        
        setIsRecording(false);
        setTimeout(() => {
          setIsProcessing(false);
          resolve({ mixed: mixedBlob, vocal: vocalBlob });
        }, 300);
      };

      recorder.stop();
      micRecorder.stop();
    });
  };

  // Sync gain nodes with state
  useEffect(() => {
    if (backingTrackGainRef.current) {
      backingTrackGainRef.current.gain.setTargetAtTime(backingTrackVolume, audioContextRef.current!.currentTime, 0.1);
    }
  }, [backingTrackVolume]);

  useEffect(() => {
    if (micGainRef.current) {
      micGainRef.current.gain.setTargetAtTime(micVolume, audioContextRef.current!.currentTime, 0.1);
    }
  }, [micVolume]);

  return {
    isReady,
    isRecording,
    isProcessing,
    processingProgress,
    recordingTime,
    backingTrackBuffer,
    backingTrackVolume,
    micVolume,
    setBackingTrackVolume,
    setMicVolume,
    loadBackingTrack,
    loadBackingTrackFromFile,
    startRecording,
    stopRecording
  };
};
