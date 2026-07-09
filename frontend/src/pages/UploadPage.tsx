import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import { documentsAPI } from '../lib/api';
import {
  Upload,
  File,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface Stage {
  key: string;
  label: string;
  description: string;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeStage, setActiveStage] = useState<string>('');
  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const processingStages: Stage[] = [
    { key: 'UPLOAD_STARTED', label: 'Uploading file stream', description: 'Transmitting PDF to secure storage.' },
    { key: 'TEXT_EXTRACTION', label: 'Extracting text content', description: 'Reading text layout pages using PyMuPDF.' },
    { key: 'CHUNKING', label: 'Chunking document sections', description: 'Splitting sections into 1000 character overlaps.' },
    { key: 'EMBEDDING_GENERATION', label: 'Generating AI embeddings', description: 'Translating text blocks into vector embeddings.' },
    { key: 'VECTOR_INDEXING', label: 'Indexing vector store', description: 'Storing embeddings into database vector collections.' },
    { key: 'SUMMARY_GENERATION', label: 'Creating study guide summary', description: 'Generating initial concepts using Gemini AI.' },
  ];

  const simulateProcessing = (_docId: string) => {
    let index = 0;
    setCompletedStages([]);

    const interval = setInterval(() => {
      if (index < processingStages.length) {
        const stage = processingStages[index];
        setActiveStage(stage.key);
        if (index > 0) {
          const prevStage = processingStages[index - 1];
          setCompletedStages((prev) => [...prev, prevStage.key]);
        }
        index++;
      } else {
        clearInterval(interval);
        setCompletedStages(processingStages.map((s) => s.key));
        setActiveStage('READY');
        toast.success('Document processed and indexed successfully!');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    }, 2500); // Transition every 2.5s for mock visual tracking
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    if (selectedFile.size > 500 * 1024 * 1024) {
      toast.error('File size exceeds 500MB upload limit.');
      return;
    }

    setFile(selectedFile);
    setUploading(true);
    setUploadProgress(0);
    setActiveStage('UPLOAD_STARTED');

    // Simulate uploading progress bar quickly
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => {
        if (p >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return p + 10;
      });
    }, 1500);

    try {
      const res = await documentsAPI.upload(selectedFile);
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const doc = res.data?.document || res.document;
      
      // If we are in mock mode, simulate the pipeline stages. If real backend, 
      // the backend Celery handles it, but since we are showing full screen progress,
      // we can simulate the status tracker for premium UX in both modes, polling the document 
      // until completed. Let's trace it.
      if (import.meta.env.VITE_USE_MOCK === 'true') {
        simulateProcessing(doc.id);
      } else {
        // Real API processing track - we will simulate the UI states or query the backend state 
        // to match UI. Let's poll backend document status and map to active stage.
        setActiveStage('TEXT_EXTRACTION');
        setCompletedStages(['UPLOAD_STARTED']);
        
        let pollCount = 0;
        const realPoll = setInterval(async () => {
          try {
            const checkRes = await documentsAPI.get(doc.id);
            const status = checkRes.data?.status || checkRes.status;
            
            if (status === 'READY') {
              clearInterval(realPoll);
              setCompletedStages(processingStages.map(s => s.key));
              setActiveStage('READY');
              toast.success('Document ready for review!');
              setTimeout(() => navigate('/'), 1200);
            } else if (status === 'FAILED') {
              clearInterval(realPoll);
              setUploading(false);
              toast.error('Document processing failed.');
            } else {
              // Map backend states
              setActiveStage(status);
              const stageIdx = processingStages.findIndex(s => s.key === status);
              if (stageIdx > 0) {
                setCompletedStages(processingStages.slice(0, stageIdx).map(s => s.key));
              }
            }
          } catch (pollErr) {
            pollCount++;
            if (pollCount > 20) {
              clearInterval(realPoll);
              setUploading(false);
              toast.error('Lost connection to document tracking task.');
            }
          }
        }, 3000);
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to upload document.');
      setUploading(false);
      setFile(null);
    }
  }, [navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: uploading,
  });

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-100 mb-1">Upload Study Material</h2>
        <p className="text-sm text-slate-400">Import textbooks, research notes, or slide presentations to index for RAG chat and practice exams.</p>
      </div>

      {!uploading ? (
        <div
          {...getRootProps()}
          className={`glass-card border-2 border-dashed p-12 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-500/5'
              : 'border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900/5'
          }`}
        >
          <input {...getInputProps()} />
          <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-indigo-400 mb-5 shadow-inner">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-md font-bold text-slate-200 mb-1">
            {isDragActive ? 'Drop your PDF here' : 'Drag & drop study PDF here'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mb-6">
            Files must be in PDF format. Size must be under 500 MB.
          </p>
          <button type="button" className="btn-primary text-xs py-2 px-6">
            Browse files
          </button>
        </div>
      ) : (
        <div className="glass-card p-8 flex flex-col gap-6">
          <div className="flex items-center gap-4 border-b border-slate-800/40 pb-5">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
              <File className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 truncate max-w-md">
                {file?.name}
              </h3>
              <p className="text-xs text-slate-500">
                Processing pipeline initialized...
              </p>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {activeStage === 'UPLOAD_STARTED' && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400">Uploading File stream</span>
                <span className="font-bold text-indigo-400">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Processing Stages Tracking */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Pipeline Stages
            </h4>
            <div className="flex flex-col gap-4">
              {processingStages.map((stage, idx) => {
                const isCompleted = completedStages.includes(stage.key);
                const isActive = activeStage === stage.key;


                return (
                  <div
                    key={stage.key}
                    className={`flex items-start gap-4 p-3 rounded-xl border transition-all duration-300 ${
                      isActive
                        ? 'border-indigo-500/35 bg-indigo-500/5'
                        : isCompleted
                        ? 'border-slate-800 bg-slate-900/10 opacity-70'
                        : 'border-slate-900 opacity-30'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      ) : isActive ? (
                        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    <div>
                      <h5 className={`text-sm font-semibold ${isActive ? 'text-slate-100' : 'text-slate-300'}`}>
                        {stage.label}
                      </h5>
                      <p className="text-xs text-slate-500 mt-0.5">{stage.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
