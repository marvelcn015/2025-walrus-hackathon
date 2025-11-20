import { useCallback, useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { encryptData } from '@/src/frontend/lib/seal';

interface UploadResult {
  blobId: string;
  filename: string;
}

interface FileUploadZoneProps {
  onUploadComplete: (result: UploadResult) => void;
  disabled?: boolean;
  accept?: string;
  maxSize?: number; // in MB
}

export function FileUploadZone({
  onUploadComplete,
  disabled = false,
  accept = '.pdf,.xlsx,.xls,.csv,.doc,.docx',
  maxSize = 50,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !isUploading) {
        setIsDragging(true);
      }
    },
    [disabled, isUploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `File size exceeds ${maxSize}MB limit`;
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    setError(null);
    setIsUploading(true);
    try {
      // 1. Encrypt data
      const fileBuffer = await file.arrayBuffer();
      const encryptedBuffer = await encryptData(fileBuffer);
      const encryptedBlob = new Blob([encryptedBuffer]);

      // 2. Prepare form data
      const formData = new FormData();
      formData.append('file', encryptedBlob, file.name);

      // 3. Upload to backend
      const response = await fetch('/api/v1/walrus/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      
      // 4. Call onUploadComplete with blobId
      onUploadComplete({ blobId: result.blobId, filename: file.name });

    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    uploadFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled || isUploading) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, isUploading, onUploadComplete]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const isComponentDisabled = disabled || isUploading;

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging && !isComponentDisabled && 'border-primary bg-primary/5',
          !isDragging && 'border-muted-foreground/25',
          isComponentDisabled && 'opacity-50 cursor-not-allowed',
          !isComponentDisabled && 'cursor-pointer hover:border-primary/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!isComponentDisabled) {
            document.getElementById('file-input')?.click();
          }
        }}
      >
        <input
          id="file-input"
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleFileInput}
          disabled={isComponentDisabled}
        />

        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm font-medium">Encrypting & Uploading...</p>
            </>
          ) : isDragging ? (
            <>
              <Upload className="h-10 w-10 text-primary animate-bounce" />
              <p className="text-sm font-medium">Drop file here</p>
            </>
          ) : (
            <>
              <FileText className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported: PDF, Excel, CSV, Word (max {maxSize}MB)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
