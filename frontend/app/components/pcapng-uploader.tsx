'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertCircle, Upload, File, X } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function PcapngUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    processFile(selectedFile);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const selectedFile = e.dataTransfer.files?.[0];
    processFile(selectedFile);
  };

  const processFile = (selectedFile?: File) => {
    setError(null);

    if (!selectedFile) {
      return;
    }

    // Check if file is a .pcapng file
    if (!selectedFile.name.toLowerCase().endsWith('.pcapng')) {
      setError('Please upload a .pcapng file only');
      return;
    }

    setFile(selectedFile);

    // Create a preview if needed
    const reader = new FileReader();
    reader.onload = (event) => {
      setFilePreview(event.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!file) return;

    setIsSubmitting(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round(
            (event.loaded / event.total) * 100,
          );
          setUploadProgress(percentComplete);
        }
      });

      // Create a promise to handle the XHR request
      const uploadPromise = new Promise<any>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error occurred'));
        };
      });

      // Send the request
      xhr.open('POST', 'http://127.0.0.1:5000/api/upload');
      xhr.send(formData);

      // Wait for the upload to complete
      const data = await uploadPromise;
      console.log('Upload and analysis successful:', data);

      // Store the analysis data directly in localStorage (no need to reference stored files)
      localStorage.setItem(
        'analysisData',
        JSON.stringify({
          data: data,
          originalFilename: file.name,
          timestamp: new Date().toISOString(),
        }),
      );

      // Redirect to the overview page
      router.push('/overview');
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className='w-full max-w-3xl mx-auto p-6 space-y-6'>
      <h1 className='text-2xl font-bold text-center mb-6'>
        Network Packet Analyzer
      </h1>
      <p className='text-center text-muted-foreground mb-8'>
        Upload a PCAPNG file to analyze network traffic patterns and protocols
      </p>

      {error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!file ? (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <input
            type='file'
            ref={fileInputRef}
            onChange={handleFileChange}
            accept='.pcapng'
            className='hidden'
          />
          <div className='flex flex-col items-center gap-4'>
            <div className='p-3 rounded-full bg-primary/10'>
              <Upload className='h-6 w-6 text-primary' />
            </div>
            <div>
              <p className='text-lg font-medium'>
                Drag and drop your .pcapng file here
              </p>
              <p className='text-sm text-muted-foreground mt-1'>
                or click to browse (.pcapng files only)
              </p>
            </div>
            <Button variant='outline' className='mt-2'>
              Select File
            </Button>
          </div>
        </div>
      ) : (
        <div className='space-y-4'>
          <div className='w-full p-6 border rounded-lg bg-muted/30'>
            <div className='flex items-center gap-4'>
              <div className='p-3 rounded-full bg-primary/10'>
                <File className='h-6 w-6 text-primary' />
              </div>
              <div className='flex-1'>
                <p className='font-medium'>File ready to upload</p>
                <p className='text-sm text-muted-foreground'>
                  {file.name}
                  {file.size
                    ? ` (${(file.size / 1024 / 1024).toFixed(2)} MB)`
                    : ''}
                </p>
              </div>
              {!isSubmitting && (
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={resetFile}
                  className='h-8 w-8'
                >
                  <X className='h-4 w-4' />
                </Button>
              )}
            </div>

            {isSubmitting && (
              <div className='mt-4 space-y-2'>
                <div className='w-full bg-secondary rounded-full h-2.5'>
                  <div
                    className='bg-primary h-2.5 rounded-full'
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className='text-xs text-right text-muted-foreground'>
                  {uploadProgress}% uploaded
                </p>
              </div>
            )}
          </div>

          <div className='flex justify-end gap-2'>
            {!isSubmitting && (
              <Button variant='outline' onClick={triggerFileInput}>
                Change File
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className='bg-blue-600 hover:bg-blue-700 text-white'
            >
              {isSubmitting
                ? `Uploading ${uploadProgress}%`
                : 'Upload & Analyze'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
