import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileText, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { extractDocument } from '../services/api';
import { DocumentExtractionResponse } from '../types/document';

interface DocumentUploadProps {
  onExtractionSuccess: (data: DocumentExtractionResponse) => void;
}

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onExtractionSuccess }) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);

    // Validate type (check extension or mime)
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Please select a valid PDF document (.pdf). Other formats are not supported.');
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(`Selected file is too large (${formatFileSize(file.size)}). Maximum allowed size is 15 MB.`);
      return;
    }

    if (file.size === 0) {
      setErrorMessage('The selected file is empty (0 bytes).');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await extractDocument(selectedFile);
      onExtractionSuccess(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred while processing the PDF.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Upload Court Document
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Select or drop an Indian judicial order, FIR, charge sheet, or judgment PDF (up to 15 MB).
            </p>
          </div>

          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-indigo-600 bg-indigo-50/50'
                : selectedFile
                ? 'border-indigo-300 bg-slate-50'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={isLoading}
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  selectedFile
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {selectedFile ? (
                  <FileText className="w-7 h-7" />
                ) : (
                  <UploadCloud className="w-7 h-7" />
                )}
              </div>

              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-slate-900 break-all">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatFileSize(selectedFile.size)} • PDF Document
                  </p>
                  <p className="text-xs text-indigo-600 font-medium mt-2 hover:underline">
                    Click or drop another file to replace
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    <span className="text-indigo-600 font-semibold hover:underline">
                      Click to browse
                    </span>{' '}
                    or drag and drop your PDF here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Standard PDF documents up to 15 MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">Upload or Extraction Error</p>
                <p className="mt-0.5 text-red-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3">
            {selectedFile && !isLoading && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setErrorMessage(null);
                }}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              disabled={!selectedFile || isLoading}
              onClick={handleProcess}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition shadow-sm ${
                !selectedFile || isLoading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-900 text-white hover:bg-indigo-800'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting Text via PyMuPDF...</span>
                </>
              ) : (
                <>
                  <span>Extract Document Text</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
