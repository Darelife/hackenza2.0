'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertCircle, File, Loader2, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ThemeToggle } from './theme-toggle';

// Define API base URL
const API_BASE_URL = 'http://localhost:8000';

export default function PcapngUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

    clearCacheData();

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

  const clearCacheData = async () => {
    try {
      // Clear the cache
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (name === 'packet-analysis-data') {
          await caches.delete(name);
          console.log('Cache cleared successfully');
        }
      }

      // Clear localStorage metadata
      localStorage.removeItem('analysisMetadata');
    } catch (err) {
      console.error('Error clearing cache:', err);
    }
  };

  // const handleSubmit = async () => {
  //   if (!file) return;

  //   setIsSubmitting(true);
  //   setUploadProgress(0);
  //   setError(null);
  //   setIsAnalyzing(false);

  //   try {
  //     const formData = new FormData();
  //     formData.append('file', file);

  //     // Use XMLHttpRequest to track upload progress
  //     localStorage.setItem('formData', JSON.stringify(formData));
  //     const xhr = new XMLHttpRequest();

  //     xhr.upload.addEventListener('progress', (event) => {
  //       if (event.lengthComputable) {
  //         const percentComplete = Math.round(
  //           (event.loaded / event.total) * 100,
  //         );
  //         setUploadProgress(percentComplete);

  //         // If upload is complete (100%), set analyzing state
  //         if (percentComplete === 100) {
  //           setIsAnalyzing(true);
  //         }
  //       }
  //     });

  //     // Create a promise to handle the XHR request
  //     const uploadPromise = new Promise<any>((resolve, reject) => {
  //       xhr.onload = () => {
  //         if (xhr.status >= 200 && xhr.status < 300) {
  //           try {
  //             const response = JSON.parse(xhr.responseText);
  //             resolve(response);
  //           } catch (e) {
  //             reject(new Error('Invalid response from server'));
  //           }
  //         } else {
  //           reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
  //         }
  //       };

  //       xhr.onerror = () => {
  //         reject(new Error('Network error occurred'));
  //       };
  //     });

  //     // Send the request
  //     xhr.open('POST', `${API_BASE_URL}/api/upload`);
  //     xhr.send(formData);

  //     // save the formdata to local storage

  //     // Wait for the upload to complete
  //     const data = await uploadPromise;
  //     console.log('Upload and analysis successful:', data);

  //     // Store the analysis data directly in localStorage (no need to reference stored files)
  //     localStorage.setItem(
  //       'analysisData',
  //       JSON.stringify({
  //         data: data,
  //         originalFilename: file.name,
  //         timestamp: new Date().toISOString(),
  //       }),
  //     );

  //     // Redirect to the overview page
  //     router.push('/overview');
  //   } catch (err) {
  //     console.error('Upload error:', err);
  //     setError(err instanceof Error ? err.message : 'Failed to upload file');
  //     setIsAnalyzing(false);
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  // In the handleSubmit function, replace the localStorage.setItem with CacheStorage
  const handleSubmit = async () => {
    if (!file) return;

    setIsSubmitting(true);
    setUploadProgress(0);
    setError(null);
    setIsAnalyzing(false);

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

          // If upload is complete (100%), set analyzing state
          if (percentComplete === 100) {
            setIsAnalyzing(true);
          }
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
      xhr.open('POST', `${API_BASE_URL}/api/upload`);
      xhr.send(formData);

      // Wait for the upload to complete
      const data = await uploadPromise;
      console.log('Upload and analysis successful:', data);

      // Store the analysis data in CacheStorage instead of localStorage
      const metaData = {
        originalFilename: file.name,
        timestamp: new Date().toISOString(),
      };

      // Store metadata in localStorage (small enough to fit)
      localStorage.setItem('analysisMetadata', JSON.stringify(metaData));

      // Store the large data in CacheStorage
      try {
        const cache = await caches.open('packet-analysis-data');
        const jsonResponse = new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
        });
        await cache.put('/analysis-data', jsonResponse);
        console.log('Data stored successfully in CacheStorage');
      } catch (cacheError) {
        console.error('Error storing data in CacheStorage:', cacheError);
      }

      // Redirect to the overview page
      router.push('/overview');
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      setIsAnalyzing(false);
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

  // Determine the button text based on current state
  const getButtonText = () => {
    if (isAnalyzing) {
      return 'Analyzing...';
    }
    if (isSubmitting) {
      return `Uploading ${uploadProgress}%`;
    }
    return 'Upload & Analyze';
  };

  return (
    <div className='relative w-full max-w-3xl mx-auto p-6'>
      <div className='mt-4 space-y-6'>
        {/* Title bar with theme toggle aligned */}
        <div className='flex justify-between items-center pt-2'>
          <h1 className='text-2xl font-bold'>Network Packet Analyzer</h1>
          <ThemeToggle />
        </div>

        <p className='text-center text-muted-foreground mb-6'>
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
                {!isSubmitting && !isAnalyzing && (
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

              {(isSubmitting || isAnalyzing) && (
                <div className='mt-4 space-y-2'>
                  <div className='w-full bg-secondary rounded-full h-2.5'>
                    <div
                      className='bg-primary h-2.5 rounded-full'
                      style={{
                        width: isAnalyzing ? '100%' : `${uploadProgress}%`,
                      }}
                    ></div>
                  </div>
                  <p className='text-xs text-right text-muted-foreground'>
                    {isAnalyzing
                      ? 'Processing file...'
                      : `${uploadProgress}% uploaded`}
                  </p>
                </div>
              )}
            </div>

            <div className='flex justify-end gap-2'>
              {!isSubmitting && !isAnalyzing && (
                <Button variant='outline' onClick={triggerFileInput}>
                  Change File
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || isAnalyzing}
                className='bg-blue-600 hover:bg-blue-700 text-white'
              >
                {isAnalyzing && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                {getButtonText()}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
