import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, FileSpreadsheet, Film, Image, File, ExternalLink, RefreshCw, Search, FolderOpen } from 'lucide-react';

const MIME_ICONS = {
  'application/vnd.google-apps.document': { icon: FileText, color: 'text-blue-500', label: 'Doc' },
  'application/vnd.google-apps.spreadsheet': { icon: FileSpreadsheet, color: 'text-green-500', label: 'Sheet' },
  'application/vnd.google-apps.presentation': { icon: Film, color: 'text-yellow-500', label: 'Slides' },
  'application/vnd.google-apps.folder': { icon: FolderOpen, color: 'text-amber-500', label: 'Folder' },
  'image/jpeg': { icon: Image, color: 'text-purple-500', label: 'Image' },
  'image/png': { icon: Image, color: 'text-purple-500', label: 'Image' },
  'application/pdf': { icon: FileText, color: 'text-red-500', label: 'PDF' },
};

function getMimeInfo(mime) {
  return MIME_ICONS[mime] || { icon: File, color: 'text-slate-500', label: 'File' };
}

function formatSize(bytes) {
  if (!bytes) return '';
  const kb = parseInt(bytes) / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function DriveReview() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    const res = await base44.functions.invoke('driveFilesReview', {});
    if (res.data.error) {
      setError(res.data.error);
    } else {
      setFiles(res.data.files || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, []);

  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.sharingUser?.displayName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Files Awaiting Review</h1>
              <p className="text-sm text-slate-500">Shared files from your Google Drive workspace</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchFiles}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search files or shared by..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Stats */}
        {!loading && !error && (
          <div className="flex gap-4 text-sm text-slate-500">
            <span><strong className="text-slate-800">{filtered.length}</strong> files awaiting review</span>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No files awaiting review found.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(file => {
              const { icon: Icon, color, label } = getMimeInfo(file.mimeType);
              return (
                <Card key={file.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800 truncate">{file.name}</p>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">{label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                        {file.sharingUser && (
                          <span>Shared by <strong>{file.sharingUser.displayName}</strong></span>
                        )}
                        {file.owners?.[0] && !file.sharingUser && (
                          <span>Owner: <strong>{file.owners[0].displayName}</strong></span>
                        )}
                        <span>Modified {new Date(file.modifiedTime).toLocaleDateString()}</span>
                        {file.size && <span>{formatSize(file.size)}</span>}
                      </div>
                    </div>
                    <a href={file.webViewLink} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="flex-shrink-0">
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}