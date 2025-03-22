'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertCircle, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';

export default function PcapngUploader() {
  const [file, setFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const reader = new FileReader();
    reader.onload = (event) => {
      setFile(event.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!file || !fileInputRef.current?.files?.[0]) return;
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('file', fileInputRef.current.files[0]);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      // save the response as a cookie
      const data = await response.json();
      document.cookie = `data=${JSON.stringify(data)}`;

      // redirect to the results page
      window.location.href = '/overview';
      
      // Handle successful upload
      console.log('File uploaded successfully');
      // You can add additional handling here
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='w-full max-w-3xl mx-auto p-6 space-y-6'>
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
              : 'border-muted-foreground/25 hover:border-primary/50'
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
                <Upload className='h-6 w-6 text-primary' />
              </div>
              <div className='flex-1'>
                <p className='font-medium'>File uploaded successfully</p>
                <p className='text-sm text-muted-foreground'>
                  {fileInputRef.current?.files?.[0]?.name || 'pcapng file'}
                  {fileInputRef.current?.files?.[0]?.size
                    ? ` (${(
                        fileInputRef.current.files[0].size /
                        1024 /
                        1024
                      ).toFixed(2)} MB)`
                    : ''}
                </p>
              </div>
            </div>
          </div>

          <div className='flex justify-between'>
            <Button variant='outline' onClick={triggerFileInput}>
              Change File
            </Button>
            <div className='flex gap-2'>
              <Button variant='destructive' onClick={() => setFile(null)}>
                Remove
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className='bg-blue-600 hover:bg-blue-700 text-white'
              >
                {isSubmitting ? 'Uploading...' : 'Upload File'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
