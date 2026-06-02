'use client';

import { useEffect, useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, FileText, Maximize2, Loader2, ExternalLink } from 'lucide-react';
import { Button } from './button';

interface DocumentViewerProps {
  fileUrl: string;
  fileName?: string;
  onClose?: () => void;
}

export function DocumentViewer({ fileUrl, fileName, onClose }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Resolved URL the viewer actually renders. For remote files we fetch them
  // into a same-origin blob URL so cross-origin headers (CORP / X-Frame-Options)
  // can't block the <img>/<iframe> embed. Local previews (blob:/data:) are used
  // as-is. `loadError` flags a failed fetch so we show a download fallback.
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Strip any query string / hash before reading the extension.
  const cleanUrl = fileUrl.split(/[?#]/)[0];
  const fileExtension = cleanUrl.split('.').pop()?.toLowerCase();
  const isPdf = fileExtension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExtension || '');
  const isDoc = ['doc', 'docx'].includes(fileExtension || '');
  const isAlreadyLocal = fileUrl.startsWith('blob:') || fileUrl.startsWith('data:');

  useEffect(() => {
    let cancelled = false;
    let createdObjectUrl: string | null = null;

    // Local previews (object URLs from the upload dialog) need no fetching.
    if (isAlreadyLocal) {
      setResolvedUrl(fileUrl);
      setLoading(false);
      setLoadError(false);
      return;
    }

    // Word docs and unknown types are never previewed inline — skip the fetch.
    if (!isPdf && !isImage) {
      setResolvedUrl(fileUrl);
      setLoading(false);
      setLoadError(false);
      return;
    }

    setLoading(true);
    setLoadError(false);
    setResolvedUrl(null);

    (async () => {
      try {
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        createdObjectUrl = URL.createObjectURL(blob);
        setResolvedUrl(createdObjectUrl);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
    };
  }, [fileUrl, isAlreadyLocal, isPdf, isImage]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));

  const handleDownload = () => {
    // Use the original URL for downloading — a top-level navigation isn't
    // subject to the cross-origin embedding restrictions.
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
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
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
            {isImage && !loadError && (
              <>
                <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoom <= 50} className="h-8">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-muted-foreground min-w-[3rem] text-center">
                  {zoom}%
                </span>
                <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoom >= 200} className="h-8">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
              </>
            )}
            <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="h-8">
              <Maximize2 className="h-4 w-4" />
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
        {loading && (isPdf || isImage) && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading document…</p>
          </div>
        )}

        {!loading && loadError &&
          fallbackPanel(
            'Could Not Load Preview',
            'We were unable to load this document for preview. You can open it in a new tab or download it instead.',
          )}

        {!loading && !loadError && isPdf && resolvedUrl && (
          <div className="w-full h-full bg-card rounded-lg overflow-hidden shadow-xl">
            <iframe
              src={`${resolvedUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full"
              title={fileName || 'PDF Document'}
            />
          </div>
        )}

        {!loading && !loadError && isImage && resolvedUrl && (
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <img
              src={resolvedUrl}
              alt={fileName || 'Document'}
              style={{ transform: `scale(${zoom / 100})` }}
              className="max-w-full max-h-[calc(100vh-128px)] object-contain transition-transform duration-200 rounded-lg shadow-xl"
            />
          </div>
        )}

        {isDoc &&
          fallbackPanel(
            'Word Document',
            "Word documents can't be previewed in the browser. Open or download to view.",
          )}

        {!isPdf && !isImage && !isDoc &&
          fallbackPanel(
            'Preview Not Available',
            'This file type cannot be previewed. Open or download to view.',
          )}
      </div>
    </div>
  );
}
