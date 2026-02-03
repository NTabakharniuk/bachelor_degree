import React from 'react';
import { XCircle, X } from 'lucide-react';

/**
 * ERROR DISPLAY COMPONENT
 * 
 * Shows error messages with dismiss option
 */
function ErrorDisplay({ error, onDismiss }) {
  if (!error) return null;

  return (
    <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3 animate-in fade-in duration-300">
      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-red-800 font-semibold mb-1">Error</p>
        <p className="text-red-700 text-sm">{error}</p>
      </div>
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-600 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

export default ErrorDisplay;