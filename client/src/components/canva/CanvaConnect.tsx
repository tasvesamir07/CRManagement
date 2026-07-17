import { useState, useEffect } from 'react';
import { canvaAPI } from '../../services/api';
import { Link, ExternalLink, Plus, Trash2, RefreshCw, Download, AlertCircle, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Template {
  id: number;
  canva_template_id: string;
  name: string;
  dataset: string | null;
  is_active: number;
  created_at: string;
}

const CanvaConnect = () => {
  const [connected, setConnected] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', canva_template_id: '', dataset: '' });

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await canvaAPI.getTemplates();
      setTemplates(res.templates || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('canva') === 'connected') {
      setConnected(true);
      window.history.replaceState({}, '', '/canva-settings');
    }
    fetchTemplates();
  }, []);

  const handleConnect = async () => {
    setAuthLoading(true);
    try {
      const res = await canvaAPI.getAuthUrl();
      if (res.url) window.location.href = res.url;
      else toast.error('Canva is not configured (missing CANVA_CLIENT_ID)');
    } catch (e: any) {
      toast.error('Failed to connect: ' + (e.response?.data?.error || e.message));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.canva_template_id) {
      toast.error('Name and Template ID are required');
      return;
    }
    try {
      await canvaAPI.saveTemplate({
        name: formData.name,
        template_type: 'brand',
        canva_template_id: formData.canva_template_id,
        dataset: formData.dataset ? formData.dataset.split(',').map(s => s.trim()) : []
      });
      toast.success('Template saved');
      setShowForm(false);
      setFormData({ name: '', canva_template_id: '', dataset: '' });
      fetchTemplates();
    } catch (e: any) {
      toast.error('Save failed: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleGeneratePdf = async (t: Template) => {
    try {
      const blob = await canvaAPI.generatePdf({
        template_id: t.id,
        data: {}
      }) as Blob;
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success('PDF generated');
    } catch (e: any) {
      toast.error('PDF generation failed: ' + (e.response?.data?.error || e.message));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md tracking-tight font-sans text-ink">Canva Integration</h1>
          <p className="text-sm text-ink-mute mt-1.5">Connect Canva to generate branded PDFs using Autofill API.</p>
        </div>
        <div className="flex gap-2">
          {!connected ? (
            <button onClick={handleConnect} disabled={authLoading}
              className="flex items-center px-4 py-2 text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep rounded-sm transition-colors cursor-pointer shadow-sm disabled:opacity-50">
              <Link className="w-4 h-4 mr-2" /> {authLoading ? 'Connecting...' : 'Connect Canva'}
            </button>
          ) : (
            <span className="flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-sm">
              <CheckCircle className="w-4 h-4 mr-2" /> Connected
            </span>
          )}
        </div>
      </div>

      {!connected && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Canva requires Enterprise or an approved Developer Trial.</p>
            <p className="mt-1">Without valid CANVA_CLIENT_ID / CANVA_CLIENT_SECRET in your <code className="bg-amber-100 px-1 rounded">.env</code>, the service will return null for all API calls.</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-hairline-cool pb-3">
            <h3 className="text-md font-medium text-ink">Add Brand Template</h3>
            <button onClick={() => setShowForm(false)} className="text-ink-mute hover:text-ink cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Template Name *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Attendance Certificate"
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Canva Template ID *</label>
              <input type="text" required value={formData.canva_template_id} onChange={e => setFormData({ ...formData, canva_template_id: e.target.value })}
                placeholder="templates/abcdef123"
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas font-mono text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Dataset Fields (comma separated)</label>
              <input type="text" value={formData.dataset} onChange={e => setFormData({ ...formData, dataset: e.target.value })}
                placeholder="student_name, course, date"
                className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink bg-canvas" />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-hairline-cool">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-hairline rounded-sm text-sm font-medium text-ink hover:bg-canvas-soft cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 border border-transparent rounded-sm shadow-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep cursor-pointer">Save Template</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-md font-medium text-ink">Saved Brand Templates</h2>
        <div className="flex gap-2">
          <button onClick={fetchTemplates} className="flex items-center px-3 py-1.5 text-xs font-medium border border-hairline rounded-sm text-ink hover:bg-canvas-soft cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center px-3 py-1.5 text-xs font-medium bg-primary text-on-primary rounded-sm hover:bg-primary-deep cursor-pointer">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Template
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-canvas border border-hairline rounded-lg shadow-sm p-12 text-center text-ink-mute text-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          Loading templates...
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-canvas border border-hairline rounded-lg shadow-sm p-12 text-center">
          <p className="text-ink-mute text-sm">No brand templates saved yet.</p>
        </div>
      ) : (
        <div className="bg-canvas border border-hairline rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-hairline">
            <thead className="bg-canvas-soft">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Template ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Dataset Fields</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mute uppercase">Saved</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-ink-mute uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {templates.map(t => (
                <tr key={t.id} className="hover:bg-canvas-soft transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-ink">{t.name}</td>
                  <td className="px-4 py-3 text-sm font-mono text-ink-mute text-xs">{t.canva_template_id}</td>
                  <td className="px-4 py-3 text-sm text-ink-mute">
                    {t.dataset ? JSON.parse(t.dataset).join(', ') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-mute">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleGeneratePdf(t)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-hairline rounded-sm text-ink hover:bg-canvas-soft cursor-pointer"
                      title="Generate PDF">
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CanvaConnect;
