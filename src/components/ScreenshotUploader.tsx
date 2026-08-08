import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Link as LinkIcon, X, Maximize2, Sparkles, CheckCircle2, Clipboard } from 'lucide-react';
import { compressImage, extractImageFromClipboard } from '../utils/imageUtils';

interface ScreenshotUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onOpenLightbox?: (url: string) => void;
  placeholder?: string;
  badgeText?: string;
}

export default function ScreenshotUploader({
  label,
  value,
  onChange,
  onOpenLightbox,
  placeholder = 'Paste URL, upload image, or press Ctrl+V',
  badgeText,
}: ScreenshotUploaderProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [urlInput, setUrlInput] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUrlInput(value);
  }, [value]);

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP, etc.).');
      return;
    }
    setIsCompressing(true);
    try {
      const compressedBase64 = await compressImage(file, 1920, 1080, 0.85);
      onChange(compressedBase64);

      // Attempt to send to local Express server if running
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: compressedBase64, name: label.replace(/[^a-zA-Z0-9]/g, '_') })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            onChange(data.url);
          }
        }
      } catch (err) {
        // Express upload endpoint unavailable, keeping local compressed base64 (saved permanently in IndexedDB)
      }
    } catch (err) {
      console.error('Failed to compress screenshot:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleProcessFile(files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedFile = extractImageFromClipboard(e.nativeEvent);
    if (pastedFile) {
      e.preventDefault();
      handleProcessFile(pastedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleProcessFile(files[0]);
    }
  };

  const handleUrlSubmit = () => {
    onChange(urlInput.trim());
  };

  return (
    <div
      ref={containerRef}
      onPaste={handlePaste}
      className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2.5 transition-all hover:border-slate-300"
    >
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <ImageIcon size={14} className="text-blue-600" />
          <span>{label}</span>
        </label>
        {badgeText && (
          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
            {badgeText}
          </span>
        )}
      </div>

      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm max-h-[180px] flex items-center justify-center">
          <img
            src={value}
            alt={label}
            className="w-full h-auto max-h-[180px] object-cover object-center group-hover:opacity-90 transition cursor-pointer"
            onClick={() => onOpenLightbox && onOpenLightbox(value)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2.5">
            <span className="text-[10px] font-bold text-white flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-400" />
              Screenshot Saved Permanently
            </span>
            <div className="flex items-center gap-1.5">
              {onOpenLightbox && (
                <button
                  type="button"
                  onClick={() => onOpenLightbox(value)}
                  className="p-1.5 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-lg transition"
                  title="Expand to fullscreen lightbox"
                >
                  <Maximize2 size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange('')}
                className="p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg transition"
                title="Remove screenshot"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-3xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Upload size={11} />
              <span>Drag / Drop / Paste</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'url'
                  ? 'bg-blue-600 text-white shadow-3xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <LinkIcon size={11} />
              <span>Paste URL Link</span>
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/80 scale-[0.99]'
                  : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              {isCompressing ? (
                <div className="flex flex-col items-center justify-center py-2 text-blue-600 gap-1.5">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] font-bold">Compressing screenshot...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-1 gap-1 text-slate-600">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl mb-1">
                    <Upload size={18} />
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    Drop image file here or <span className="text-blue-600 underline">Browse</span>
                  </div>
                  <div className="text-[10px] text-slate-600 flex items-center gap-1 font-mono">
                    <Clipboard size={10} className="text-slate-600" />
                    <span>Tip: Press <strong>Ctrl + V</strong> anywhere to paste from clipboard</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlSubmit())}
                placeholder="https://tradingview.com/x/..."
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleUrlSubmit}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
