'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Check,
  Clock,
  ChefHat,
  List,
  Sparkles,
  Timer,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { scaleIngredientAmount } from '@/lib/recipe-scaling';

interface MiseCookingModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: any;
  scaleFactor?: number;
}

export function MiseCookingModeModal({
  isOpen,
  onClose,
  recipe,
  scaleFactor = 1,
}: MiseCookingModeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [showIngredientsSidebar, setShowIngredientsSidebar] = useState(false);

  // Countdown timer state
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [initialTimerSeconds, setInitialTimerSeconds] = useState<number | null>(null);
  const [timerSoundEnabled, setTimerSoundEnabled] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<any>(null);

  const rawInstructions = recipe?.instructions;
  const steps: string[] = Array.isArray(rawInstructions)
    ? rawInstructions
    : typeof rawInstructions === 'string' && rawInstructions.startsWith('[')
    ? (() => {
        try {
          return JSON.parse(rawInstructions);
        } catch {
          return [rawInstructions];
        }
      })()
    : typeof rawInstructions === 'string'
    ? rawInstructions.split('\n').filter((s: string) => s.trim().length > 0)
    : [];

  const ingredients = recipe?.ingredients || [];

  // Wake lock on open
  useEffect(() => {
    if (isOpen) {
      if ('wakeLock' in navigator) {
        (navigator as any).wakeLock
          ?.request('screen')
          .then((lock: any) => {
            wakeLockRef.current = lock;
          })
          .catch(() => {});
      }
    } else {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      setTimerRunning(false);
      setTimerSeconds(null);
    }

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, [isOpen]);

  // Detect time in current step
  useEffect(() => {
    if (!steps[currentStep]) return;

    const text = steps[currentStep];
    const match = text.match(/(\d+)(?:\s*(?:-|to)\s*(\d+))?\s*(minutes|mins|minute|min|hours|hour|seconds|secs)/i);
    if (match) {
      const num = parseInt(match[2] || match[1], 10);
      const unit = match[3].toLowerCase();
      let secs = num * 60;
      if (unit.startsWith('hour')) secs = num * 3600;
      if (unit.startsWith('sec')) secs = num;

      setInitialTimerSeconds(secs);
      setTimerSeconds(secs);
      setTimerRunning(false);
    } else {
      setInitialTimerSeconds(null);
      setTimerSeconds(null);
      setTimerRunning(false);
    }
  }, [currentStep, steps]);

  // Timer countdown loop
  useEffect(() => {
    let interval: any = null;
    if (timerRunning && timerSeconds !== null && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      playBeep();
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const playBeep = () => {
    if (!timerSoundEnabled) return;
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        if (currentStep < steps.length - 1) setCurrentStep((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentStep > 0) setCurrentStep((prev) => prev - 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, steps.length, onClose]);

  if (!isOpen || !recipe) return null;

  const currentStepText = steps[currentStep] || 'Enjoy your meal!';
  const progressPercent = steps.length > 0 ? Math.round(((currentStep + 1) / steps.length) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0814] text-white flex flex-col font-sans select-none animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-purple-900/40 bg-[#120a1f]/90 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 shrink-0">
            <ChefHat className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider font-mono">
              Hands-Free Cooking Mode
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-sm sm:max-w-md">
              {recipe.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowIngredientsSidebar(!showIngredientsSidebar)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showIngredientsSidebar
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white/10 hover:bg-white/15 text-purple-200 border border-purple-500/30'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ingredients</span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full font-mono">
              {ingredients.length}
            </span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-charcoal-300 hover:text-white transition-colors cursor-pointer"
            title="Exit Cooking Mode (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-purple-950/60 h-1.5">
        <div
          className="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-amber-400 h-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Body Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Step Center View */}
        <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-4xl mx-auto w-full">
          {/* Step Indicator */}
          <div className="flex items-center justify-between text-xs font-mono text-purple-300/70 border-b border-purple-900/30 pb-3">
            <span className="font-bold text-sm text-purple-400">
              STEP {currentStep + 1} OF {steps.length}
            </span>
            <span>{progressPercent}% COMPLETE</span>
          </div>

          {/* Large Step Text */}
          <div className="my-auto py-8 space-y-6">
            <p className="text-2xl sm:text-3xl md:text-4xl font-serif font-medium leading-relaxed sm:leading-relaxed md:leading-relaxed text-purple-50">
              {currentStepText}
            </p>

            {/* Smart Step Timer Box */}
            {initialTimerSeconds !== null && timerSeconds !== null && (
              <div className="inline-flex items-center gap-4 p-4 rounded-2xl bg-purple-950/80 border border-purple-500/50 shadow-xl backdrop-blur-md animate-in fade-in">
                <div className="flex items-center gap-2 text-purple-300 font-mono text-xl sm:text-2xl font-bold">
                  <Timer className={`w-6 h-6 ${timerRunning ? 'text-amber-400 animate-pulse' : 'text-purple-400'}`} />
                  <span className={timerSeconds === 0 ? 'text-amber-400 font-black animate-bounce' : ''}>
                    {formatTimer(timerSeconds)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 border-l border-purple-800/60 pl-3">
                  <button
                    onClick={() => setTimerRunning(!timerRunning)}
                    className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                  <button
                    onClick={() => {
                      setTimerRunning(false);
                      setTimerSeconds(initialTimerSeconds);
                    }}
                    className="p-2 bg-white/10 hover:bg-white/20 text-purple-200 rounded-xl transition-all cursor-pointer"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTimerSeconds((prev) => (prev !== null ? prev + 60 : 60))}
                    className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-[11px] font-mono text-purple-200 rounded-xl transition-all font-bold cursor-pointer"
                  >
                    +1m
                  </button>
                  <button
                    onClick={() => setTimerSoundEnabled(!timerSoundEnabled)}
                    className="p-2 text-purple-400 hover:text-purple-200"
                    title="Toggle sound"
                  >
                    {timerSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-charcoal-500" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Step Navigation Controls */}
          <div className="flex items-center justify-between gap-4 pt-6 border-t border-purple-900/30">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-purple-200 disabled:opacity-30 disabled:pointer-events-none font-bold text-sm transition-all cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Previous Step</span>
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
                className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-extrabold text-sm shadow-xl hover:shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Check className="w-5 h-5" />
                <span>Finish Cooking</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Ingredients Drawer */}
        {showIngredientsSidebar && (
          <div className="w-80 sm:w-96 border-l border-purple-900/40 bg-[#120a1f] p-5 flex flex-col overflow-y-auto shrink-0 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-purple-900/40 mb-3">
              <h3 className="font-serif font-bold text-base text-purple-100 flex items-center gap-2">
                <List className="w-4 h-4 text-purple-400" /> Ingredients ({scaleFactor}x)
              </h3>
              <button
                onClick={() => setShowIngredientsSidebar(false)}
                className="text-purple-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 flex-1">
              {ingredients.map((ing: any, idx: number) => {
                const isChecked = !!checkedIngredients[idx];
                const scaledAmount = scaleIngredientAmount(ing.amount, scaleFactor);

                return (
                  <div
                    key={idx}
                    onClick={() =>
                      setCheckedIngredients((prev) => ({
                        ...prev,
                        [idx]: !prev[idx],
                      }))
                    }
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                      isChecked
                        ? 'bg-purple-950/40 border-purple-900/30 text-purple-400 line-through opacity-60'
                        : 'bg-white/5 border-purple-500/20 text-purple-100 hover:bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center shrink-0 ${
                        isChecked
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'border-purple-400/50 bg-black/20'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <span className="font-bold text-amber-300 mr-1.5 font-mono">
                        {scaledAmount} {ing.unit}
                      </span>
                      <span>{ing.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
