import { useState, useEffect, useRef, useCallback } from 'react';

export const useVoiceflow = ({ onSpeechResult, autoSpeak = true } = {}) => {
  // Voice Recognition States
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceMode, setVoiceMode] = useState('push-to-talk'); // 'push-to-talk' | 'continuous'

  // Text to Speech States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(autoSpeak);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  // Audio Analyzer / Frequency Levels for Waveform Visualizer
  const [audioLevel, setAudioLevel] = useState(0);
  const [frequencyData, setFrequencyData] = useState(new Array(16).fill(10));

  // Refs
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const currentUtteranceRef = useRef(null);
  const isListeningRef = useRef(isListening);

  isListeningRef.current = isListening;

  // Initialize Speech Recognition & Synthesis Voices
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let currentInterim = '';
        let finalTranscriptChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscriptChunk += result[0].transcript;
          } else {
            currentInterim += result[0].transcript;
          }
        }

        if (currentInterim) {
          setInterimTranscript(currentInterim);
        }

        if (finalTranscriptChunk) {
          const cleanFinal = finalTranscriptChunk.trim();
          setTranscript(cleanFinal);
          setInterimTranscript('');
          if (onSpeechResult) {
            onSpeechResult(cleanFinal);
          }
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition status/error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current && voiceMode === 'continuous') {
          try {
            recognition.start();
          } catch (_) {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('Web Speech API is not supported in this browser environment.');
    }

    // Load TTS Voices
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        // Prefer natural / google / english voices
        const preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        setSelectedVoice(preferred || null);
      }
    };

    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [onSpeechResult, voiceMode]);

  // Real-time Audio Visualizer Analyzer
  const startAudioAnalyzer = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateFrequency = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        const bars = [];
        const step = Math.floor(bufferLength / 16) || 1;

        for (let i = 0; i < 16; i++) {
          const val = dataArray[i * step] || 0;
          sum += val;
          // Scale bar height between 8px and 48px
          bars.push(Math.max(8, Math.round((val / 255) * 44)));
        }

        const avg = sum / bufferLength;
        setAudioLevel(avg / 255);
        setFrequencyData(bars);

        animationFrameRef.current = requestAnimationFrame(updateFrequency);
      };

      updateFrequency();
    } catch (err) {
      console.warn('Audio Visualizer setup skipped:', err.message);
    }
  };

  const stopAudioAnalyzer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    setAudioLevel(0);
    setFrequencyData(new Array(16).fill(8));
  };

  // Start Voice Recognition
  const startListening = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
    }
    setTranscript('');
    setInterimTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        startAudioAnalyzer();
      } catch (err) {
        console.warn('Recognition start caught:', err.message);
      }
    }
  }, [isSpeaking]);

  // Stop Voice Recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
    stopAudioAnalyzer();
  }, []);

  // Toggle Voice Recognition
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Text-To-Speech (AI speaks aloud)
  const speakText = useCallback((textToSpeak) => {
    if (!('speechSynthesis' in window) || !textToSpeak) return;

    window.speechSynthesis.cancel();

    // Clean text of markdown characters for smooth speech
    const cleanSpeech = textToSpeak
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*_~>]/g, '')
      .trim();

    if (!cleanSpeech) return;

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = 1.05; // natural talking speed
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [selectedVoice]);

  // Stop Speaking
  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return {
    // STT
    isListening,
    transcript,
    interimTranscript,
    speechSupported,
    voiceMode,
    setVoiceMode,
    startListening,
    stopListening,
    toggleListening,
    // TTS
    isSpeaking,
    autoSpeakEnabled,
    setAutoSpeakEnabled,
    speakText,
    stopSpeaking,
    availableVoices,
    selectedVoice,
    setSelectedVoice,
    // Visualizer data
    audioLevel,
    frequencyData
  };
};

export default useVoiceflow;
