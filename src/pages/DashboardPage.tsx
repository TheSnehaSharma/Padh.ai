import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, Loader2, Trash2, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { uploadPDFs } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/store/accessibility';
import { useStudyStore } from '@/store/study';
import { useUploadsStore, FileCategory } from '@/store/uploads';
import { fadeIn, slideUp, staggerContainer } from '@/lib/animations';

const CATEGORIES: FileCategory[] = ['PYQs', 'Syllabus', 'Reference Book', "Teacher's Notes"];

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { files, addFiles, removeFile, setCategory } = useUploadsStore();
  const { 
    setTopics, 
    setSelectedTopicId, 
    setPassPack, 
    lastGeneratedFileIds, 
    setLastGeneratedFileIds,
    clearTopicData
  } = useStudyStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const { isADHDMode } = useAccessibilityStore();

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setError(null);
    
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors[0].code === 'file-too-large') {
        setError(`File "${rejection.file.name}" is too large. Max size is 50MB, but the network proxy often blocks files over 15MB. Please compress or split the PDF.`);
        return;
      }
      setError(rejection.errors[0].message);
      return;
    }

    const timestamp = Date.now();
    const newFiles = acceptedFiles.map((file, index) => ({
      id: `${timestamp}-${index}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      category: null as FileCategory | null
    }));
    addFiles(newFiles);
  }, [addFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024 // 50MB limit as requested
  });

  const allFilesCategorized = files.length > 0 && files.every(f => f.category !== null);

  // Check if files have changed since last generation
  const currentFileIds = files.map(f => f.id).sort().join(',');
  const lastGeneratedIds = lastGeneratedFileIds.slice().sort().join(',');
  const hasChanges = currentFileIds !== lastGeneratedIds;

  const handleGenerate = async () => {
    if (files.length === 0) return;

    // If no changes, just navigate to study
    if (!hasChanges) {
      navigate('/study');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(10);
    setLoadingText("Uploading documents...");

    try {
      const filesToUpload = files.map(f => f.file);
      const categories = files.map(f => f.category as string);
      
      // Real API call
      const response = await uploadPDFs(filesToUpload, categories);

      // Clear existing topics/passpack to force refresh on next page load
      setTopics(response.topics || []);
      setSelectedTopicId(null);
      setPassPack(null);
      clearTopicData(); // Clear cached topic data
      
      // Update last generated state
      setLastGeneratedFileIds(files.map(f => f.id));

      setProgress(100);
      setLoadingText("Ready to study!");
      await new Promise(r => setTimeout(r, 500));
      
      navigate('/study');
    } catch (error: any) {
      console.error("Upload failed", error);
      setIsGenerating(false);
      setError(error.message || "Failed to upload documents. Please try again.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 sm:p-8 max-w-5xl mx-auto px-6 sm:px-8">
      <motion.div 
        variants={fadeIn}
        initial="initial"
        animate="animate"
        className="text-center space-y-4 mb-12"
      >
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          <span className="text-foreground">Upload. Analyze. </span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-teal-400">Ace.</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Drag & drop your syllabus and PYQs. We'll build your personalized exam strategy in seconds.
        </p>
      </motion.div>

      <div className="w-full max-w-3xl space-y-8">
        <div
          {...getRootProps()}
          className={cn(
            "group relative border border-dashed rounded-3xl p-8 sm:p-16 text-center cursor-pointer transition-all duration-300 ease-out overflow-hidden",
            "bg-glass backdrop-blur-xl border-glass-border shadow-sm shadow-glass-shadow",
            isDragActive 
              ? "border-primary bg-primary/5 scale-[1.02] shadow-2xl shadow-primary/10" 
              : "hover:border-primary/50 hover:bg-background/50 hover:shadow-xl"
          )}
        >
          <input {...getInputProps()} />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="p-6 bg-background/50 backdrop-blur-md rounded-2xl shadow-lg ring-1 ring-white/20 group-hover:scale-110 transition-transform duration-300">
              <Upload className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-semibold tracking-tight">
                {isDragActive ? "Drop files now" : "Drop PDF files here"}
              </p>
              <p className="text-base text-muted-foreground">
                or click to browse from your computer
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2">
                Max: 50MB (Recommended: &lt; 15MB for best results)
              </p>
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-4"
          >
            <AnimatePresence mode="popLayout">
              {files.map((fileUpload) => (
                <motion.div
                  key={fileUpload.id}
                  variants={slideUp}
                  initial="initial"
                  animate="animate"
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <Card className="p-4 bg-glass backdrop-blur-xl border-glass-border shadow-sm shadow-glass-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="p-3 bg-primary/10 rounded-xl">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate text-lg">{fileUpload.file.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {(fileUpload.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex flex-wrap gap-2 justify-end">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => setCategory(fileUpload.id, cat)}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                                fileUpload.category === cat
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                                  : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                              )}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8"
                          onClick={() => removeFile(fileUpload.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        <div className="pt-8 flex flex-col items-center gap-4">
          <AnimatePresence>
            {error && (
              <motion.div
                key="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-md p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm text-center font-medium"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, width: "100%" }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-md space-y-4 bg-muted/30 p-6 rounded-2xl border backdrop-blur-md"
              >
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div className="flex-1 flex justify-between text-sm font-medium">
                    <span>{loadingText}</span>
                    <span className="font-mono">{progress}%</span>
                  </div>
                </div>
                <Progress value={progress} className="h-2" />
              </motion.div>
            ) : (
              <Button 
                key="generate-button"
                size="lg" 
                className={cn(
                  "text-lg h-16 px-12 rounded-full shadow-2xl transition-all duration-300",
                  allFilesCategorized 
                    ? "bg-primary hover:bg-primary/90 hover:scale-105 hover:shadow-primary/25" 
                    : "opacity-50 cursor-not-allowed",
                  !hasChanges && allFilesCategorized && "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                )}
                onClick={handleGenerate}
                disabled={!allFilesCategorized}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {hasChanges ? "Generate Pass Pack" : "Go to Study"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

