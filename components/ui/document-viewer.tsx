'use client';

import { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText, Maximize2 } from 'lucide-react';
import { Button } from './button';

interface DocumentViewerProps {
  fileUrl: string;
  fileName?: string;
  onClose?: () => void;
}

export function DocumentViewer({ fileUrl, fileName, onClose }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fileExtension = fileUrl.split('.').pop()?.toLowerCase();
  const isPdf = fileExtension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExtension || '');
  const isDoc = ['doc', 'docx'].includes(fileExtension || '');

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'document';
    link.click();
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

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {fileName || 'Document'}
              </p>
              <p className="text-xs text-muted-foreground">
                {fileExtension?.toUpperCase()} Document
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  className="h-8"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-muted-foreground min-w-[3rem] text-center">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  className="h-8"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8"
            >
              <Download className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="h-[calc(100vh-64px)] overflow-auto bg-muted/30 flex items-center justify-center p-4">
        {isPdf && (
          <div className="w-full h-full bg-card rounded-lg overflow-hidden shadow-xl">
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full"
              title={fileName || 'PDF Document'}
            />
          </div>
        )}

        {isImage && (
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <img
              src={fileUrl}
              alt={fileName || 'Document'}
              style={{ transform: `scale(${zoom / 100})` }}
              className="max-w-full max-h-[calc(100vh-128px)] object-contain transition-transform duration-200 rounded-lg shadow-xl"
            />
          </div>
        )}

        {isDoc && (
          <div className="bg-card border border-border rounded-lg p-8 max-w-2xl text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Word Document
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Word documents can't be previewed in the browser. Download to view.
            </p>
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download Document
            </Button>
          </div>
        )}

        {!isPdf && !isImage && !isDoc && (
          <div className="bg-card border border-border rounded-lg p-8 max-w-2xl text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Preview Not Available
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              This file type cannot be previewed. Download to view.
            </p>
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download File
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
