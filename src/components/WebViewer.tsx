import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Globe,
  Lock,
} from 'lucide-react';

interface WebViewerProps {
  isOpen: boolean;
  url: string;
  onClose: () => void;
}

const IFRAME_LOAD_TIMEOUT_MS = 6000;

export const WebViewer: React.FC<WebViewerProps> = ({ isOpen, url, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadDetectedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [error, setError] = useState<string | null>(null);
  const [autoOpened, setAutoOpened] = useState(false);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startLoadTimeout = useCallback(
    (targetUrl: string) => {
      clearTimeouts();
      loadDetectedRef.current = false;
      timeoutRef.current = setTimeout(() => {
        if (!loadDetectedRef.current) {
          setLoading(false);
          setAutoOpened(true);
          window.open(targetUrl, '_blank');
          setError('This site blocks iframe embedding and has been opened in a new tab.');
        }
      }, IFRAME_LOAD_TIMEOUT_MS);
    },
    [clearTimeouts]
  );

  useEffect(() => {
    if (isOpen && isSafeUrl(url)) {
      startLoadTimeout(url);
    }
    return clearTimeouts;
  }, [isOpen, url, startLoadTimeout, clearTimeouts]);

  useEffect(() => {
    if (!isOpen) {
      clearTimeouts();
      setLoading(true);
      setError(null);
      setAutoOpened(false);
    }
  }, [isOpen, clearTimeouts]);

  if (!isOpen) return null;

  // Safety: only allow http/https URLs
  const isSafeUrl = (u: string) => u.startsWith('http://') || u.startsWith('https://');
  const displayUrl = currentUrl.replace(/^https?:\/\//, '').slice(0, 60);

  const handleIframeLoad = () => {
    loadDetectedRef.current = true;
    clearTimeouts();
    setLoading(false);
  };

  const handleIframeError = () => {
    loadDetectedRef.current = true;
    clearTimeouts();
    setLoading(false);
    setError('Failed to load the page. It may block iframe embedding.');
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setAutoOpened(false);
    startLoadTimeout(currentUrl);
    try {
      iframeRef.current?.contentWindow?.location.reload();
    } catch {
      // Cross-origin reload not possible; force re-render by toggling src
      setCurrentUrl('');
      setTimeout(() => setCurrentUrl(currentUrl), 50);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-3xl h-[80vh] bg-[#0E0E10] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#121214]">
          {/* Navigation buttons */}
          <button
            onClick={() => {
              try { iframeRef.current?.contentWindow?.history.back(); } catch { /* cross-origin */ }
            }}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              try { iframeRef.current?.contentWindow?.history.forward(); } catch { /* cross-origin */ }
            }}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            title="Go forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* URL bar */}
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-white/50 font-mono min-w-0">
            {isSafeUrl(currentUrl) ? (
              <Globe className="w-3 h-3 text-green-400 flex-shrink-0" />
            ) : (
              <Lock className="w-3 h-3 text-red-400 flex-shrink-0" />
            )}
            <span className="truncate">{displayUrl}</span>
          </div>

          {/* Open in new tab */}
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Loading bar */}
        {loading && (
          <div className="h-0.5 bg-orange-500/20 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-1/3 bg-orange-500 animate-[shimmer_1s_ease-in-out_infinite]" style={{ animation: 'shimmer 1s ease-in-out infinite' }} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 relative bg-white">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Globe className="w-12 h-12 text-white/20 mb-3" />
              <p className="text-sm text-white/60 mb-1">Unable to load page</p>
              <p className="text-xs text-white/30 mb-3 max-w-md">{error}</p>
              {!autoOpened && (
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded-xl font-medium transition-colors"
                >
                  Open in Browser
                </a>
              )}
              {autoOpened && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded-xl font-medium transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={isSafeUrl(currentUrl) ? currentUrl : ''}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              title="Web Viewer"
            />
          )}
        </div>
      </div>
    </div>
  );
};
