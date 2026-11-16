import React, { useState, useRef } from 'react';
import { Upload, Camera, Image as ImageIcon, X, Maximize2, Link as LinkIcon, Loader2, Sparkles } from 'lucide-react';
import { compressImage, extractImageFromClipboard } from '../utils/imageUtils';

interface ChecklistImageUploaderProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  onOpenLightbox?: (url: string) => void;
  compact?: boolean;
  placeholder?: string;
}

export default function ChecklistImageUploader({
  label,
  value,
  onChange,
  onOpenLightbox,
  compact = false,
  placeholder = 'Add Chart Image',
}: ChecklistImageUploaderProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlText, setUrlText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP).');
      return;
    }
    setIsCompressing(true);
    try {
      const compressed = await compressImage(file, 1920, 1080, 0.85);
      onChange(compressed);
    } catch (err) {
      console.error('Image compression failed:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedFile = extractImageFromClipboard(e.nativeEvent);
    if (pastedFile) {
      e.preventDefault();
      handleProcessFile(pastedFile);
    }
  };

  const handleUrlSubmit = () => {
    if (urlText.trim()) {
      onChange(urlText.trim());
      setShowUrlInput(false);
      setUrlText('');
    }
  };

  if (compact) {
    return (
      <div className="w-full flex flex-col gap-1.5" onPaste={handlePaste}>
        {/* Hidden File Picker (Gallery / File Explorer) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleProcessFile(e.target.files[0]);
            }
          }}
        />

        {/* Hidden Camera Input (Native Camera Shoot) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleProcessFile(e.target.files[0]);
            }
          }}
        />

        {value ? (
          <div className="relative group flex items-center justify-between p-2 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-violet-300 transition-all">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                onClick={() => onOpenLightbox && onOpenLightbox(value)}
                className="relative h-12 w-16 shrink-0 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 cursor-pointer shadow-3xs group/thumb"
                title="Click to zoom screenshot"
              >
                <img
                  src={value}
                  alt={label || 'Chart analysis'}
                  className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 size={12} className="text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <span className="text-2xs font-extrabold text-slate-800 truncate block">
                  {label ? `${label} Chart` : 'Chart Attached'}
                </span>
                <span className="text-4xs text-emerald-600 font-bold block flex items-center gap-1">
                  ✓ Screenshot Saved
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Retake Camera */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                title="Retake photo using camera"
              >
                <Camera size={13} />
              </button>
              {/* Replace Gallery */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 rounded-lg text-3xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                title="Replace from gallery"
              >
                Replace
              </button>
              {/* Remove */}
              <button
                type="button"
                onClick={() => onChange('')}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Remove image"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Direct Camera Button */}
            <button
              type="button"
              disabled={isCompressing}
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-3xs sm:text-2xs font-black transition-all shadow-[0_2px_8px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
              title="Open camera directly to take photo"
            >
              <Camera size={13} className="stroke-[2.5px]" />
              <span>Camera</span>
            </button>

            {/* Gallery Upload Button */}
            <button
              type="button"
              disabled={isCompressing}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200/90 hover:border-violet-400 bg-white hover:bg-slate-50 text-slate-700 hover:text-violet-700 text-3xs sm:text-2xs font-bold transition-all shadow-3xs cursor-pointer"
              title="Select from gallery or files"
            >
              {isCompressing ? (
                <>
                  <Loader2 size={13} className="animate-spin text-violet-600" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Upload size={13} className="stroke-[2.5px]" />
                  <span>Gallery</span>
                </>
              )}
            </button>

            {/* Link URL Button */}
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-violet-600 transition cursor-pointer shadow-3xs shrink-0"
              title="Paste image link URL"
            >
              <LinkIcon size={13} />
            </button>
          </div>
        )}

        {showUrlInput && !value && (
          <div className="flex items-center gap-1.5 p-1.5 bg-violet-50/80 border border-violet-200 rounded-xl animate-fadeIn">
            <input
              type="url"
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              placeholder="Paste image URL (https://...)"
              className="flex-1 px-2.5 py-1 text-2xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleUrlSubmit();
                }
              }}
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              className="px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white text-3xs font-black rounded-lg cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full-featured expanded card mode (for Liquidity and Final Trade Plan)
  return (
    <div className="space-y-2.5" onPaste={handlePaste}>
      {label && (
        <label className="text-2xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <ImageIcon size={13} className="text-violet-600" />
          <span>{label}</span>
        </label>
      )}

      {/* Hidden File Pickers */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleProcessFile(e.target.files[0]);
          }
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleProcessFile(e.target.files[0]);
          }
        }}
      />

      {value ? (
        <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 shadow-md max-h-[300px] flex items-center justify-center transition-all hover:border-violet-400">
          <img
            src={value}
            alt={label || 'Chart analysis'}
            className="w-full h-auto max-h-[300px] object-contain cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]"
            onClick={() => onOpenLightbox && onOpenLightbox(value)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3.5">
            <span className="text-2xs font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Chart Analysis Screenshot
            </span>
            <div className="flex items-center gap-2">
              {onOpenLightbox && (
                <button
                  type="button"
                  onClick={() => onOpenLightbox(value)}
                  className="px-2.5 py-1 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-lg text-3xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Maximize2 size={12} />
                  <span>Zoom</span>
                </button>
              )}
              {/* Retake Camera */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-2.5 py-1 bg-emerald-500/80 hover:bg-emerald-500 text-white rounded-lg text-3xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <Camera size={11} />
                <span>Camera</span>
              </button>
              {/* Replace Gallery */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-lg text-3xs font-bold transition cursor-pointer"
              >
                Replace
              </button>
              {/* Delete */}
              <button
                type="button"
                onClick={() => onChange('')}
                className="p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg transition cursor-pointer"
                title="Delete screenshot"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-300 hover:border-violet-400 bg-slate-50/70 hover:bg-white rounded-3xl p-6 text-center transition-all duration-200 group shadow-3xs space-y-4"
        >
          {isCompressing ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 size={26} className="animate-spin text-violet-600" />
              <span className="text-xs font-bold text-slate-600">Compressing and optimizing chart image...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-black text-slate-800">
                  Attach Chart Analysis / Level Screenshot
                </p>
                <p className="text-3xs text-slate-400 font-medium">
                  Snap directly with phone camera, upload from gallery, or paste from TradingView
                </p>
              </div>

              {/* Action Buttons: Camera + Gallery */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black shadow-[0_3px_12px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Camera size={14} className="stroke-[2.5px]" />
                  <span>Take Photo (Camera)</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-violet-700 text-xs font-bold shadow-2xs hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Upload size={14} className="stroke-[2.5px]" />
                  <span>Choose from Gallery</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-violet-600 transition cursor-pointer shadow-2xs"
                  title="Or paste image URL"
                >
                  <LinkIcon size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showUrlInput && !value && (
        <div className="flex items-center gap-2 p-2 bg-violet-50/80 border border-violet-200 rounded-xl animate-fadeIn">
          <input
            type="url"
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder="Paste TradingView chart snapshot URL (https://...)"
            className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 font-sans"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleUrlSubmit();
              }
            }}
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Attach
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
