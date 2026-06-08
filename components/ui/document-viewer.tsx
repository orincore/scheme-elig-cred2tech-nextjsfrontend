'use client';

import { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, FileText, Maximize2, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from './button';

interface DocumentViewerProps {
  fileUrl: string;
  fileName?: string;
  onClose?: () => void;
}

export function DocumentViewer({ fileUrl, fileName, onClose }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [imgError, setImgError] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobLoading, setBlobLoading] = useState(false);
  const [blobError, setBlobError] = useState(false);

  const extOf = (s?: string) => {
    const clean = (s || '').split(/[?#]/)[0];
    const i = clean.lastIndexOf('.');
    return i >= 0 && i < clean.length - 1 ? clean.slice(i + 1).toLowerCase() : '';
  };
  const fileExtension = extOf(fileName) || extOf(fileUrl);
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(fileExtension);
  const isPdf   = fileExtension === 'pdf';
  const isDoc   = ['doc', 'docx'].includes(fileExtension);
  const isLocal = fileUrl.startsWith('blob:') || fileUrl.startsWith('data:');

  // Reset all state when the URL changes (viewer reused for a different doc).
  useEffect(() => {
    setImgError(false);
    setZoom(100);
    setBlobUrl(null);
    setBlobError(false);
    setBlobLoading(false);
  }, [fileUrl]);

  // Fetch remote PDFs as a blob so they can be embedded via a same-origin blob URL.
  // Chrome's PDF viewer blocks top-frame navigation for cross-origin iframes, but
  // blob: URLs are same-origin so the restriction doesn't apply.
  useEffect(() => {
    if (!isPdf || isLocal) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    setBlobLoading(true);
    setBlobUrl(null);
    setBlobError(false);

    fetch(fileUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setBlobLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setBlobError(true);
          setBlobLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileUrl, isPdf, isLocal]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'document';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  const handleOpenInNewTab = () => {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const fallbackPanel = (title: string, message: string) => (
    <div className="bg-card border border-border rounded-lg p-8 max-w-2xl text-center">
      <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6">{message}</p>
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" onClick={handleOpenInNewTab} className="gap-2">
          <ExternalLink className="h-4 w-4" />
          Open in New Tab
        </Button>
        <Button onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {fileName || 'Document'}
              </p>
              <p className="text-xs text-muted-foreground">
                {fileExtension?.toUpperCase() || 'FILE'} Document
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isImage && !imgError && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.max(z - 25, 50))} disabled={zoom <= 50} className="h-8">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-muted-foreground min-w-[3rem] text-center">
                  {zoom}%
                </span>
                <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.min(z + 25, 200))} disabled={zoom >= 200} className="h-8">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
              </>
            )}
            <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="h-8">
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleOpenInNewTab} className="h-8" title="Open in new tab">
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8">
              <Download className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="h-[calc(100vh-64px)] overflow-auto bg-muted/30 flex items-center justify-center p-4">

        {/* ── Image ─────────────────────────────────────────────────────────── */}
        {isImage && !imgError && (
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <img
              src={fileUrl}
              alt={fileName || 'Document'}
              onError={() => setImgError(true)}
              style={{ transform: `scale(${zoom / 100})` }}
              className="max-w-full max-h-[calc(100vh-128px)] object-contain transition-transform duration-200 rounded-lg shadow-xl"
            />
          </div>
        )}

        {isImage && imgError &&
          fallbackPanel('Could Not Load Image', 'The image failed to load. You can open it in a new tab or download it.')}

        {/* ── PDF ───────────────────────────────────────────────────────────── */}
        {/* Local blob/data URLs embed directly (same-origin, safe).
            Remote PDFs are fetched and converted to a blob URL first so Chrome's
            PDF viewer doesn't try to navigate the top frame (cross-origin block). */}

        {isPdf && isLocal && (
          <div className="w-full h-full bg-card rounded-lg overflow-hidden shadow-xl">
            <iframe
              src={fileUrl}
              className="w-full h-full border-0"
              title={fileName || 'PDF Document'}
            />
          </div>
        )}

        {isPdf && !isLocal && blobLoading && (
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading PDF…</p>
          </div>
        )}

        {isPdf && !isLocal && blobUrl && (
          <div className="w-full h-full bg-card rounded-lg overflow-hidden shadow-xl">
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title={fileName || 'PDF Document'}
            />
          </div>
        )}

        {isPdf && !isLocal && blobError &&
          fallbackPanel('Could Not Load PDF', 'The PDF could not be fetched. You can open it in a new tab or download it directly.')}

        {/* ── Word / other ───────────────────────────────────────────────────── */}
        {isDoc &&
          fallbackPanel('Word Document', "Word documents can't be previewed in the browser. Open or download to view.")}

        {!isPdf && !isImage && !isDoc &&
          fallbackPanel('Preview Not Available', 'This file type cannot be previewed inline. Open or download to view.')}
      </div>
    </div>
  );
}
