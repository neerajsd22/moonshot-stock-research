import { useState } from 'react';
import { X, Upload, ClipboardPaste, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { portfolioApi } from './api';

const PreviewTable = ({ positions, broker, warnings }) => (
  <div className="mt-4 space-y-3">
    {broker && (
      <div className="flex items-center gap-2 text-xs text-[#d946ef] bg-[rgba(217,70,239,0.06)] px-3 py-2 rounded-lg border border-[rgba(217,70,239,0.2)]">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Detected format: <b>{broker}</b></span>
      </div>
    )}
    <div className="text-xs text-gray-400">
      Found <b className="text-white">{positions.length}</b> position{positions.length !== 1 ? 's' : ''} ready to import.
    </div>
    <div className="max-h-64 overflow-y-auto border border-[rgba(255,255,255,0.08)] rounded-lg">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-[rgba(15,15,20,0.95)] backdrop-blur-md">
          <tr className="border-b border-[rgba(255,255,255,0.08)]">
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Ticker</th>
            <th className="text-right py-2 px-3 text-gray-400 font-medium">Shares</th>
            <th className="text-right py-2 px-3 text-gray-400 font-medium">Avg Cost</th>
            <th className="text-right py-2 px-3 text-gray-400 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p, i) => (
            <tr key={i} className="border-b border-[rgba(255,255,255,0.04)]">
              <td className="py-2 px-3 text-white font-semibold mono-numbers">{p.ticker}</td>
              <td className="text-right py-2 px-3 text-gray-300 mono-numbers">{p.shares}</td>
              <td className="text-right py-2 px-3 text-gray-300 mono-numbers">${p.avg_cost.toFixed(2)}</td>
              <td className="text-right py-2 px-3 text-gray-500">{p.buy_date || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {warnings && warnings.length > 0 && (
      <div className="text-xs space-y-1">
        {warnings.slice(0, 5).map((w, i) => (
          <div key={i} className="flex items-start gap-1.5 text-amber-400">
            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>{w}</span>
          </div>
        ))}
        {warnings.length > 5 && (
          <div className="text-gray-500">+{warnings.length - 5} more warnings</div>
        )}
      </div>
    )}
  </div>
);

const ImportDialog = ({ isOpen, onClose, onImported }) => {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const reset = () => { setText(''); setPreview(null); };

  const handleFile = async (file) => {
    if (!file) return;
    const content = await file.text();
    setText(content);
    await runPreview(content);
  };

  const runPreview = async (content) => {
    if (!content || !content.trim()) {
      toast.error('Please paste or upload some data first.');
      return;
    }
    setBusy(true);
    try {
      const data = await portfolioApi.importPreview(content);
      setPreview(data);
      if (data.positions.length === 0) {
        toast.warning('No positions detected. Check the format.');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Parse failed');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    setBusy(true);
    try {
      const res = await portfolioApi.importConfirm(text);
      toast.success(`Imported ${res.imported} position${res.imported !== 1 ? 's' : ''}`);
      reset();
      onImported && onImported();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm fade-in"
      data-testid="portfolio-import-dialog"
      onClick={(e) => { if (e.target === e.currentTarget) { reset(); onClose(); } }}
    >
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-[rgba(10,10,15,0.98)] border border-[rgba(217,70,239,0.25)] rounded-t-2xl sm:rounded-2xl gold-gradient-border">
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,10,15,0.98)] backdrop-blur-md">
          <h2 className="text-lg font-bold gold-text" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Import Portfolio
          </h2>
          <button onClick={() => { reset(); onClose(); }} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.06)]" data-testid="import-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!preview ? (
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="upload" data-testid="import-tab-upload">
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload CSV
                </TabsTrigger>
                <TabsTrigger value="paste" data-testid="import-tab-paste">
                  <ClipboardPaste className="w-3.5 h-3.5 mr-1.5" /> Paste
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-4">
                <label
                  htmlFor="csv-file-input"
                  className="block border-2 border-dashed border-[rgba(217,70,239,0.3)] hover:border-[#d946ef] rounded-xl p-8 text-center cursor-pointer transition-colors bg-[rgba(217,70,239,0.03)]"
                  data-testid="csv-dropzone"
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-[#d946ef]" />
                  <div className="text-sm text-white font-medium mb-1">Drop a CSV file here or click to browse</div>
                  <div className="text-xs text-gray-500">Robinhood · Fidelity · Schwab · Vanguard · E*TRADE · Webull · any CSV</div>
                  <input
                    id="csv-file-input"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    className="hidden"
                    data-testid="csv-file-input"
                  />
                </label>
              </TabsContent>

              <TabsContent value="paste" className="mt-4 space-y-3">
                <div className="text-xs text-gray-400">
                  Paste rows in any format. Auto-detects columns. Examples:<br />
                  <code className="text-gray-300">NVDA, 50, 420.10</code> ·{' '}
                  <code className="text-gray-300">AAPL 120 178.50</code> ·{' '}
                  <code className="text-gray-300">MSFT: 35 @ $310</code>
                </div>
                <textarea
                  rows={8}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={'Symbol, Quantity, Cost Basis\nNVDA, 50, 420.10\nAAPL, 120, 178.50\nMSFT, 35, 310.00'}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg p-3 text-sm font-mono text-gray-300 focus:border-[#d946ef] focus:outline-none"
                  data-testid="import-paste-textarea"
                />
                <Button
                  onClick={() => runPreview(text)}
                  disabled={busy || !text.trim()}
                  className="w-full bg-[#d946ef] hover:bg-[#f0abfc] text-[#0a0a0f] font-semibold"
                  data-testid="import-parse-button"
                >
                  {busy ? 'Parsing...' : 'Parse & Preview →'}
                </Button>
              </TabsContent>
            </Tabs>
          ) : (
            <>
              <PreviewTable positions={preview.positions} broker={preview.broker} warnings={preview.warnings} />
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setPreview(null)} className="flex-1" data-testid="import-back">
                  ← Back
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={busy || preview.positions.length === 0}
                  className="flex-1 bg-[#d946ef] hover:bg-[#f0abfc] text-[#0a0a0f] font-semibold"
                  data-testid="import-confirm"
                >
                  {busy ? 'Importing...' : `Import ${preview.positions.length} position${preview.positions.length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportDialog;
