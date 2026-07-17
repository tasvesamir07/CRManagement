import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BookOpen, Clock, Send, X, Plus, ListPlus, StickyNote, Save,
  AlertTriangle, ArrowLeft, ChevronDown, GripVertical, Sparkles, Trash2, WifiOff } from 'lucide-react';
import { DatePicker } from '../ui/date-picker';
import { TimePicker } from '../ui/time-picker';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { TITLE_PRESETS } from '../../lib/announcementPresets';
import PlatformSelector from './PlatformSelector';
import SchedulePicker from './SchedulePicker';
import FileUploader from './FileUploader';
import PreviewPanel from './PreviewPanel';
import ConfirmBroadcastModal from './ConfirmBroadcastModal';
import LightboxPreviewModal from './LightboxPreviewModal';
import AIDraftModal from './AIDraftModal';
import LibraryModal from './LibraryModal';
import useAnnouncementForm, { createNewNoticeObj } from '../../hooks/useAnnouncementForm';

const AnnouncementForm: React.FC = () => {
  const {
    courses, platforms, loadingData, templates, selectedTemplate,
    broadcastMode, setBroadcastMode, fileCaption, setFileCaption, customText, setCustomText,
    notices, setNotices, closingText, setClosingText,
    selectedPlatforms, alreadySentPlatforms, waStatus,
    uploadedFiles, uploadProgress, uploading, dragActive,
    submitting, announcementId, showConfirmModal, scheduleDateTime, showSchedulePicker,
    previewTab, setPreviewTab, showLibraryModal, showAIModal,
    aiPrompt, setAiPrompt, aiDrafting, generatedDraft,
    previewFile, previewUrl, previewLoading, previewTextContent, previewTextError,
    fileInputRef, isEditMode, isOnline,
    handleNoticeFieldChange, handlePresetChange, handleTitleChange,
    handleCourseChange, handleDateChange,
    addSectionField, removeSectionField, handleSectionChange,
    addTopic, removeTopic, handleTopicDragStart, handleTopicDrop,
    addNote, removeNote, handleNoteTypeChange, handleNoteDragStart, handleNoteDrop,
    getShowTopics,
    handlePreview, handleOpenLibrary, handleAttachFromLibrary,
    handlePlatformToggle, removeAttachment,
    handleDrag, handleDrop, handleFileChange,
    handleTemplateApply, getCompiledMessage,
    handleSaveDraft, handleGenerateAIDraft, handleConfirmBroadcast, handleSendBroadcast,
    handleScheduleBroadcast, setScheduleDateTime, setShowSchedulePicker,
    setShowConfirmModal, setShowAIModal, setShowLibraryModal,
    setPreviewFile, setPreviewUrl, setGeneratedDraft
  } = useAnnouncementForm();

  if (loadingData) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-8">
      {!isOnline && (
        <div className="bg-accent-yellow/10 border border-accent-yellow/20 rounded-sm px-3 py-2 text-xs text-ink flex items-center gap-2 animate-in fade-in">
          <WifiOff className="w-3.5 h-3.5 text-ink-mute" />
          Offline — this notice will be saved locally and broadcast when you reconnect
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 -ml-2 text-ink-mute hover:text-ink hover:bg-canvas-soft rounded-sm transition-colors cursor-pointer" title="Back to Dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-display-md tracking-tight font-sans text-ink">{isEditMode ? 'Edit Broadcast' : 'New Broadcast'}</h1>
            <p className="text-sm text-ink-mute mt-1.5 font-sans">{isEditMode ? 'Modify your draft and broadcast when ready.' : 'Formulate and dispatch course notices to all active channels simultaneously.'}</p>
          </div>
        </div>
        {announcementId && <span className="text-[10px] font-mono text-ink-mute bg-canvas-soft border border-hairline px-2 py-1 rounded-sm">ID: {announcementId}</span>}
      </div>

      {templates.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-accent-violet/5 border border-accent-violet/20 rounded-sm">
          <span className="text-xs font-medium text-accent-violet">Quick-fill from template:</span>
          <select value={selectedTemplate} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleTemplateApply(e.target.value)} className="px-3 py-1.5 text-sm border border-hairline rounded-sm bg-canvas text-ink focus:outline-none focus:border-primary flex-1 max-w-[300px]">
            <option value="">Select a template...</option>
            {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); handleConfirmBroadcast(); }} className="lg:col-span-7 bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-6">
          <div className="flex gap-2 p-1 bg-canvas-soft border border-hairline rounded-sm w-fit mb-6">
            <button type="button" onClick={() => setBroadcastMode('notice')} className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${broadcastMode === 'notice' ? 'bg-primary text-on-primary shadow-sm' : 'text-ink-mute hover:text-ink hover:bg-canvas'}`}>📢 Structured Notice</button>
            <button type="button" onClick={() => setBroadcastMode('custom')} className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${broadcastMode === 'custom' ? 'bg-primary text-on-primary shadow-sm' : 'text-ink-mute hover:text-ink hover:bg-canvas'}`}>✍️ Custom Text Notice</button>
            <button type="button" onClick={() => setBroadcastMode('share_file')} className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${broadcastMode === 'share_file' ? 'bg-primary text-on-primary shadow-sm' : 'text-ink-mute hover:text-ink hover:bg-canvas'}`}>📎 Share File Only</button>
          </div>

          {broadcastMode === 'share_file' && (
            <div>
              <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Message / Caption (Optional)</label>
              <textarea value={fileCaption} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFileCaption(e.target.value)} placeholder="Type an optional message to accompany the file(s)..." rows={4}
                className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink hover:border-hairline-strong transition-all duration-150 resize-y min-h-[80px]" />
            </div>
          )}

          {broadcastMode === 'custom' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Notice Title *</label>
                  <input type="text" required value={notices[0]?.title || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTitleChange(0, e.target.value)} placeholder="e.g. Makeup Class Announcement"
                    className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink hover:border-hairline-strong transition-all duration-150" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Target Course (Optional)</label>
                  <div className="custom-select-wrapper">
                    <select value={notices[0]?.selectedCourseId || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleCourseChange(0, e.target.value)}
                      className="custom-select block w-full pl-3 pr-10 h-9 py-1.5 border border-hairline rounded-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink hover:border-hairline-strong transition-all duration-150">
                      <option value="">General Notice (No Course)</option>
                      {courses.map((c: any) => <option key={c.id} value={c.id}>{c.course_id} - {c.course_name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute"><ChevronDown className="h-4 w-4" /></div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Notice Body *</span>
                  <button type="button" onClick={() => setShowAIModal(true)}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-primary hover:text-primary-deep bg-primary/10 rounded-sm transition-all cursor-pointer border-none">
                    <Sparkles className="w-3.5 h-3.5" /> Draft with AI
                  </button>
                </label>
                <textarea value={customText} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomText(e.target.value)} placeholder="Write your notice text here... Use *bold* for emphasis." rows={8}
                  className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink hover:border-hairline-strong transition-all duration-150 resize-y min-h-[150px] font-sans leading-relaxed" />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] font-medium text-ink-mute flex items-center mr-1">Presets:</span>
                  {[
                    { label: '📝 Quiz Alert', title: 'Quiz Alert', body: '📝 *Quiz Alert*\n\n📚 *Course:* [Course Name]\n📅 *Date:* [Date]\n⏰ *Time:* [Time]\n📝 *Topics:* [Topics]\n\nPlease be prepared and attend on time. Good luck! 🍀📖' },
                    { label: '📁 Assignment Deadline', title: 'Assignment Deadline', body: '📁 *Assignment Deadline*\n\n📚 *Course:* [Course Name]\n📅 *Deadline:* [Date & Time]\n📋 *Instructions:* [Details]\n\nPlease submit on time.' },
                    { label: '📅 Class Rescheduled', title: 'Class Rescheduled', body: '📅 *Class Rescheduled Notice*\n\n📚 *Course:* [Course Name]\n⏰ *New Slot:* [Date, Time & Room]\n\nPlease adjust your schedule accordingly.' },
                    { label: '❌ Class Cancelled', title: 'Class Cancelled', body: '❌ *Class Cancellation Notice*\n\n📚 *Course:* [Course Name]\n📅 *Date:* [Date]\n\nClass is cancelled for today. Make-up schedule will be shared later.' }
                  ].map(preset => (
                    <button key={preset.title} type="button"
                      onClick={() => { handleTitleChange(0, preset.title); setCustomText(preset.body); toast.success(`Preset "${preset.title}" loaded`); }}
                      className="px-2 py-0.5 text-[10px] font-medium rounded-full border border-hairline bg-canvas hover:bg-canvas-soft text-ink-mute hover:text-ink transition-all cursor-pointer">
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {broadcastMode === 'notice' && (
            <div className="space-y-6">
              {notices.map((notice: any, nIdx: number) => {
                const showTopics = getShowTopics(notice);
                return (
                  <div key={notice.id || nIdx} className="border border-hairline rounded-md bg-canvas shadow-sm overflow-hidden transition-all">
                    <div onClick={() => handleNoticeFieldChange(nIdx, 'isExpanded', !notice.isExpanded)}
                      className="flex items-center justify-between px-4 py-3 bg-canvas-soft border-b border-hairline cursor-pointer select-none hover:bg-canvas-soft-strong transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-ink">Notice #{nIdx + 1}: {notice.title || 'Untitled'}</span>
                        <span className="text-[10px] font-mono text-ink-mute bg-canvas border border-hairline px-1.5 py-0.5 rounded-sm uppercase">{notice.category}</span>
                      </div>
                      <div className="flex items-center gap-3" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        {notices.length > 1 && (
                          <button type="button" onClick={() => { if (window.confirm(`Are you sure you want to delete Notice #${nIdx + 1}?`)) { setNotices((prev: any[]) => prev.filter((_: any, idx: number) => idx !== nIdx)); toast.success(`Notice #${nIdx + 1} deleted`); } }}
                            className="p-1 text-ink-mute hover:text-accent-tomato hover:bg-accent-tomato/10 rounded transition-colors cursor-pointer border-none bg-transparent" title="Delete Notice">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button type="button" onClick={() => handleNoticeFieldChange(nIdx, 'isExpanded', !notice.isExpanded)}
                          className="p-1 text-ink-mute hover:text-ink hover:bg-canvas rounded transition-colors cursor-pointer border-none bg-transparent">
                          <ChevronDown className={`w-4 h-4 transform transition-transform duration-200 ${notice.isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {notice.isExpanded && (
                      <div className="p-4 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Notice Preset</label>
                            <div className="custom-select-wrapper">
                              <select value={notice.titlePreset} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePresetChange(nIdx, e.target.value)}
                                className="custom-select block w-full pl-3 pr-10 h-9 py-1.5 border border-hairline rounded-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink hover:border-hairline-strong transition-all duration-150">
                                {TITLE_PRESETS.map((p: any) => <option key={p.value} value={p.value}>{p.label}</option>)}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute"><ChevronDown className="w-4 w-4" /></div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {[
                                { value: 'Quiz - 1', label: '📝 Quiz' }, { value: 'Class Cancelled', label: '❌ Cancel' },
                                { value: 'Assignment', label: '📁 Assignment' }, { value: 'Routine Change', label: '📅 Routine' },
                                { value: 'General Notice', label: '📣 General' }
                              ].map(btn => (
                                <button key={btn.value} type="button" onClick={() => handlePresetChange(nIdx, btn.value)}
                                  className={`px-2 py-0.5 text-[10px] font-medium rounded-full border transition-all cursor-pointer ${notice.titlePreset === btn.value ? 'bg-primary border-primary text-on-primary shadow-sm scale-102 font-semibold' : 'bg-canvas hover:bg-canvas-soft border-hairline text-ink-mute hover:text-ink'}`}>
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">Title Text *</label>
                            <input type="text" value={notice.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTitleChange(nIdx, e.target.value)} placeholder="e.g. Quiz - 4"
                              className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink hover:border-hairline-strong transition-all duration-150" />
                          </div>
                        </div>

                        <div className="bg-canvas-soft border border-hairline rounded-sm p-4 space-y-5">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary flex items-center"><BookOpen className="w-4 h-4 mr-1.5 text-primary" /> Course & Date Context</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={(notice.category === 'syllabus' || notice.category === 'suggestion') ? "md:col-span-2" : ""}>
                              <label className="block text-[11px] font-medium text-ink-mute mb-1">Target Course</label>
                              <div className="custom-select-wrapper">
                                <select value={notice.selectedCourseId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleCourseChange(nIdx, e.target.value)}
                                  className="custom-select block w-full pl-3 pr-10 h-9 py-1.5 border border-hairline rounded-sm bg-canvas text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-hairline-strong transition-all duration-150">
                                  <option value="">General Notice (No Course)</option>
                                  {courses.map((c: any) => <option key={c.id} value={c.id}>{c.course_id} - {c.course_name}</option>)}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute"><ChevronDown className="w-4 h-4" /></div>
                              </div>
                            </div>
                            {(notice.category !== 'syllabus' && notice.category !== 'suggestion') && (
                              <div>
                                <label className="block text-[11px] font-medium text-ink-mute mb-1">Event Date</label>
                                <DatePicker value={notice.selectedDate} onChange={(val: string) => handleDateChange(nIdx, val)} placeholder="Select Event Date" />
                              </div>
                            )}
                          </div>
                        </div>

                        {(notice.category !== 'class_cancel' && notice.category !== 'syllabus' && notice.category !== 'suggestion' || (notice.category === 'class_cancel' && (notice.makeupStatus === 'rescheduled' || notice.makeupStatus === 'online'))) && (
                          <div className="bg-canvas-soft border border-hairline rounded-sm p-4 space-y-4">
                            <div className="flex items-center justify-between border-b border-hairline-cool pb-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary flex items-center"><Clock className="w-4 h-4 mr-1.5 text-primary" /> Timings & Class Rooms (Sections)</h4>
                              <button type="button" onClick={() => addSectionField(nIdx)} className="flex items-center text-xs font-semibold text-primary hover:text-primary-deep cursor-pointer border-none bg-transparent"><Plus className="w-3.5 h-3.5 mr-1" /> Add Section</button>
                            </div>
                            <div className="space-y-4">
                              {notice.sections.map((sec: any, idx: number) => (
                                <div key={idx} className="flex flex-col md:flex-row items-end gap-3 p-3 bg-canvas border border-hairline rounded-sm relative">
                                  {notice.sections.length > 1 && <button type="button" onClick={() => removeSectionField(nIdx, idx)} className="absolute top-2 right-2 p-1 text-ink-mute hover:text-accent-tomato hover:bg-accent-tomato/10 rounded transition-colors cursor-pointer border-none bg-transparent"><X className="w-3.5 h-3.5" /></button>}
                                  <div className="w-full md:w-[10%]">
                                    <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Section *</label></div>
                                    <input type="text" required value={sec.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSectionChange(nIdx, idx, 'name', e.target.value)} placeholder="e.g. A"
                                      className="w-full h-9 px-3 py-1.5 border border-hairline rounded-sm text-xs bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-hairline-strong transition-all duration-150" />
                                  </div>
                                  <div className="w-full md:w-[16%]">
                                    <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Time Option</label></div>
                                    <div className="custom-select-wrapper">
                                      <select value={sec.timeOption || 'select'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { const opt = e.target.value; handleSectionChange(nIdx, idx, 'timeOption', opt); if (opt !== 'select' && opt !== 'custom') handleSectionChange(nIdx, idx, 'startTime', ''); }}
                                        className="custom-select block w-full pl-2 pr-7 h-9 py-1.5 border border-hairline bg-canvas rounded-sm text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink hover:border-hairline-strong transition-all duration-150">
                                        <option value="select">⏱️ Set Time</option><option value="custom">✏️ Custom Text</option><option value="tbd">⏳ Not Decided</option><option value="none">❌ No Time</option>
                                      </select>
                                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-ink-mute"><ChevronDown className="h-3.5 w-3.5" /></div>
                                    </div>
                                  </div>
                                  {sec.timeOption === 'custom' ? (
                                    <div className="w-full md:w-[36%]">
                                      <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Custom Time Text</label></div>
                                      <input type="text" value={sec.startTime || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSectionChange(nIdx, idx, 'startTime', e.target.value)} placeholder="e.g. 11:30 AM (Tentative)"
                                        className="w-full h-9 px-3 py-1.5 border border-hairline rounded-sm text-xs bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-hairline-strong transition-all duration-150" />
                                    </div>
                                  ) : (!sec.timeOption || sec.timeOption === 'select') ? (
                                    <>
                                      <div className="w-full md:w-[18%]">
                                        <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Start Time</label></div>
                                        <TimePicker value={sec.startTime || ''} onChange={(val: string) => handleSectionChange(nIdx, idx, 'startTime', val)} placeholder="Start Time" className="text-xs" />
                                      </div>
                                      <div className="w-full md:w-[18%]">
                                        <div className="h-5 flex items-end justify-between mb-1">
                                          <label className="block text-[10px] font-semibold text-ink-mute leading-none">End Time</label>
                                          <label className="inline-flex items-center text-[9px] font-semibold text-primary cursor-pointer select-none leading-none pb-0.5">
                                            <input type="checkbox" checked={sec.hasEndTime !== false} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { handleSectionChange(nIdx, idx, 'hasEndTime', e.target.checked); if (!e.target.checked) handleSectionChange(nIdx, idx, 'endTime', ''); }} className="mr-0.5 accent-primary w-2.5 h-2.5" /> Range
                                          </label>
                                        </div>
                                        {sec.hasEndTime !== false ? (
                                          <TimePicker value={sec.endTime || ''} onChange={(val: string) => handleSectionChange(nIdx, idx, 'endTime', val)} placeholder="End Time" className="text-xs" />
                                        ) : (
                                          <div className="w-full px-2 py-1.5 border border-dashed border-hairline bg-canvas-soft rounded-sm text-[10px] text-ink-mute font-medium text-center h-9 flex items-center justify-center select-none">Singular Time</div>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full md:w-[36%]">
                                      <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Timing Status</label></div>
                                      <div className="w-full px-3 py-1.5 border border-dashed border-hairline bg-canvas-soft rounded-sm text-xs text-ink-mute h-9 flex items-center justify-center select-none font-medium">
                                        {sec.timeOption === 'tbd' ? '⏳ Will announce later' : '❌ No time needed'}
                                      </div>
                                    </div>
                                  )}
                                  <div className="w-full md:w-[20%]">
                                    <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Mode</label></div>
                                    <div className="custom-select-wrapper">
                                      <select value={sec.mode} disabled={notice.makeupStatus === 'online'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSectionChange(nIdx, idx, 'mode', e.target.value)}
                                        className="custom-select block w-full pl-3 pr-7 h-9 py-1.5 border border-hairline bg-canvas rounded-sm text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink disabled:opacity-60 disabled:cursor-not-allowed hover:border-hairline-strong transition-all duration-150">
                                        <option value="Offline">🏫 Offline Room</option><option value="Online">🏫 Room - Online</option>
                                      </select>
                                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-ink-mute"><ChevronDown className="h-3.5 w-3.5" /></div>
                                    </div>
                                  </div>
                                  {sec.mode === 'Offline' && (
                                    <div className="w-full md:w-[18%]">
                                      <div className="h-5 flex items-end mb-1"><label className="block text-[10px] font-semibold text-ink-mute leading-none">Room #</label></div>
                                      <input type="text" value={sec.room} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSectionChange(nIdx, idx, 'room', e.target.value)} placeholder="e.g. 611"
                                        className="w-full h-9 px-3 py-1.5 border border-hairline rounded-sm text-xs bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-hairline-strong transition-all duration-150" />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {notice.category === 'class_cancel' && (
                          <div className="bg-canvas-soft border border-hairline rounded-sm p-4 space-y-3">
                            <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1">Make-up / Rescheduling Option</label>
                            <div className="custom-select-wrapper">
                              <select value={notice.makeupStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { const statusVal = e.target.value; handleNoticeFieldChange(nIdx, 'makeupStatus', statusVal); if (statusVal === 'online') setNotices((prev: any[]) => { const u = [...prev]; u[nIdx].sections = u[nIdx].sections.map((s: any) => ({ ...s, mode: 'Online', room: '' })); return u; }); }}
                                className="custom-select block w-full pl-3 pr-10 h-9 py-1.5 border border-hairline rounded-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink hover:border-hairline-strong transition-all duration-150">
                                <option value="later">⏰ Make-up time will be shared later</option>
                                <option value="rescheduled">📅 Rescheduled to new time/room slot</option>
                                <option value="online">📍 Held Online instead (at same/new time)</option>
                                <option value="none">❌ Just Cancelled (No make-up)</option>
                                <option value="custom">✏️ Custom Rescheduling Details...</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute"><ChevronDown className="w-4 h-4" /></div>
                            </div>
                            {notice.makeupStatus === 'custom' && (
                              <div className="mt-2.5">
                                <label className="block text-[11px] font-semibold text-ink-mute mb-1">Custom Make-up / Rescheduling Text *</label>
                                <input type="text" required value={notice.customMakeupText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNoticeFieldChange(nIdx, 'customMakeupText', e.target.value)} placeholder="e.g. Makeup class on Friday at 3:00 PM in Room 602."
                                  className="appearance-none block w-full h-9 px-3 py-1.5 border border-hairline rounded-sm shadow-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-ink hover:border-hairline-strong transition-all duration-150" />
                              </div>
                            )}
                          </div>
                        )}

                        {showTopics && (
                          <div className="bg-canvas-soft border border-hairline rounded-sm p-4 space-y-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary flex items-center"><ListPlus className="w-4 h-4 mr-1.5 text-primary" /> {notice.category === 'syllabus' ? 'Syllabus Details' : notice.category === 'suggestion' ? 'Suggestions' : 'Topics / Syllabus'}</h4>
                            <div className="flex gap-2">
                              <input type="text" value={notice.currentTopic || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNoticeFieldChange(nIdx, 'currentTopic', e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addTopic(nIdx); } }} placeholder={notice.category === 'syllabus' ? 'Type syllabus detail...' : notice.category === 'suggestion' ? 'Type suggestion...' : 'Type topic and press Enter...'}
                                className="w-full px-3 py-1.5 border border-hairline rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                              <button type="button" onClick={() => addTopic(nIdx)} className="px-3 py-1.5 border border-hairline hover:border-hairline-strong rounded-sm text-xs font-medium text-ink bg-canvas transition-colors cursor-pointer">Add</button>
                            </div>
                            {notice.topics.length > 0 && (
                              <div className="space-y-1.5 max-h-[200px] overflow-y-auto p-1.5 border border-hairline rounded-sm bg-canvas">
                                {notice.topics.map((t: string, i: number) => (
                                  <div key={i} draggable onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleTopicDragStart(e, nIdx, i)} onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()} onDrop={(e: React.DragEvent<HTMLDivElement>) => handleTopicDrop(e, nIdx, i)}
                                    className="flex items-center justify-between text-xs text-ink-secondary py-1.5 px-2 hover:bg-canvas-soft rounded-sm border border-transparent hover:border-hairline transition-all duration-150 cursor-move select-none">
                                    <span className="truncate flex items-center gap-1.5"><GripVertical className="w-3.5 h-3.5 text-ink-mute cursor-grab active:cursor-grabbing flex-shrink-0" /><span className="truncate">• {t}</span></span>
                                    <button type="button" onClick={() => removeTopic(nIdx, i)} className="text-ink-mute hover:text-accent-tomato cursor-pointer border-none bg-transparent"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="bg-canvas-soft border border-hairline rounded-sm p-4 space-y-4">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary flex items-center"><StickyNote className="w-4 h-4 mr-1.5 text-primary" /> Instructions & Notes</h4>
                          <div className="flex gap-2">
                            <select value={notice.noteType || 'note'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleNoticeFieldChange(nIdx, 'noteType', e.target.value)}
                              className="px-2 py-1.5 border border-hairline rounded-sm text-xs bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150">
                              <option value="note">Note</option><option value="instruction">Instruction</option><option value="important">Important</option>
                            </select>
                            <input type="text" value={notice.currentNote || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNoticeFieldChange(nIdx, 'currentNote', e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addNote(nIdx); } }} placeholder="Add cover page / submit slides link..."
                              className="flex-1 px-3 py-1.5 border border-hairline rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                            <button type="button" onClick={() => addNote(nIdx)} className="px-3 py-1.5 border border-hairline hover:border-hairline-strong rounded-sm text-xs font-medium text-ink bg-canvas transition-colors cursor-pointer">Add</button>
                          </div>
                          {notice.notes.length > 0 && (
                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto p-1.5 border border-hairline rounded-sm bg-canvas">
                              {notice.notes.map((n: any, i: number) => {
                                const isObj = typeof n === 'object' && n !== null;
                                const text = isObj ? n.text : n;
                                const type = isObj ? n.type : 'note';
                                const typeLabel = type === 'instruction' ? 'Instruction' : type === 'important' ? 'Important' : 'Note';
                                const badgeColor = type === 'instruction' ? 'bg-primary/10 text-primary' : type === 'important' ? 'bg-accent-tomato/10 text-accent-tomato' : 'bg-accent-violet/10 text-accent-violet';
                                const BadgeIcon = type === 'instruction' ? BookOpen : type === 'important' ? AlertTriangle : StickyNote;
                                return (
                                  <div key={i} draggable onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleNoteDragStart(e, nIdx, i)} onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()} onDrop={(e: React.DragEvent<HTMLDivElement>) => handleNoteDrop(e, nIdx, i)}
                                    className="flex items-center justify-between text-xs text-ink-secondary py-1.5 px-2 hover:bg-canvas-soft rounded-sm border border-transparent hover:border-hairline transition-all duration-150 cursor-move select-none">
                                    <span className="truncate flex items-center gap-1.5">
                                      <GripVertical className="w-3.5 h-3.5 text-ink-mute cursor-grab active:cursor-grabbing flex-shrink-0" />
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button type="button" draggable={false} onPointerDown={(e: React.PointerEvent) => e.stopPropagation()} onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
                                            className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold uppercase ${badgeColor} flex items-center gap-1 hover:brightness-95 cursor-pointer transition-all border-none focus:outline-none`}>
                                            <BadgeIcon className="w-2.5 h-2.5" /> {typeLabel}
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-28 bg-canvas border border-hairline shadow-lg p-1 text-xs">
                                          <DropdownMenuItem onSelect={() => handleNoteTypeChange(nIdx, i, 'note')} className="flex items-center gap-1.5 px-2 py-1 hover:bg-canvas-soft rounded cursor-pointer text-ink font-semibold"><StickyNote className="w-3.5 h-3.5 text-accent-violet" /> Note</DropdownMenuItem>
                                          <DropdownMenuItem onSelect={() => handleNoteTypeChange(nIdx, i, 'instruction')} className="flex items-center gap-1.5 px-2 py-1 hover:bg-canvas-soft rounded cursor-pointer text-ink font-semibold"><BookOpen className="w-3.5 h-3.5 text-primary" /> Instruction</DropdownMenuItem>
                                          <DropdownMenuItem onSelect={() => handleNoteTypeChange(nIdx, i, 'important')} className="flex items-center gap-1.5 px-2 py-1 hover:bg-canvas-soft rounded cursor-pointer text-ink font-semibold"><AlertTriangle className="w-3.5 h-3.5 text-accent-tomato" /> Important</DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                      <span className="truncate">{text}</span>
                                    </span>
                                    <button type="button" draggable={false} onPointerDown={(e: React.PointerEvent) => e.stopPropagation()} onMouseDown={(e: React.MouseEvent) => e.stopPropagation()} onClick={() => removeNote(nIdx, i)}
                                      className="text-ink-mute hover:text-accent-tomato cursor-pointer border-none bg-transparent"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <button type="button" onClick={() => setNotices((prev: any[]) => [...prev, createNewNoticeObj(prev.length)])}
                className="w-full flex items-center justify-center py-2.5 px-4 border border-dashed border-primary hover:border-primary-deep rounded bg-canvas hover:bg-canvas-soft text-sm font-semibold text-primary hover:text-primary-deep transition-all cursor-pointer shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Add Another Notice
              </button>

              <div className="bg-canvas border border-hairline rounded-md p-4 space-y-2">
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider">Global Closing / Remarks Text (Optional)</label>
                <textarea value={closingText} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setClosingText(e.target.value)} placeholder="e.g. Please be prepared and attend on time. Good luck! 🍀📖" rows={3}
                  className="appearance-none block w-full px-3 py-2 border border-hairline rounded-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-ink font-sans resize-y min-h-[60px]" />
              </div>
            </div>
          )}

          <FileUploader fileInputRef={fileInputRef} uploadedFiles={uploadedFiles} uploading={uploading} uploadProgress={uploadProgress}
            dragActive={dragActive} onDrag={handleDrag} onDrop={handleDrop} onFileChange={handleFileChange} onRemove={removeAttachment}
            onChooseFromLibrary={handleOpenLibrary} />

          <PlatformSelector platforms={platforms} selectedPlatforms={selectedPlatforms} onToggle={handlePlatformToggle} waStatus={waStatus} alreadySentPlatforms={alreadySentPlatforms} />

          <div className="pt-4 border-t border-hairline-cool space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleSaveDraft} disabled={submitting || uploading}
                  className="flex items-center justify-center py-2 px-4 border border-hairline rounded-sm shadow-sm text-sm font-medium text-ink bg-canvas hover:bg-canvas-soft focus:outline-none transition-colors duration-150 cursor-pointer disabled:opacity-50">
                  <Save className="w-4 h-4 mr-1.5" />{submitting ? 'Saving...' : announcementId ? 'Update Draft' : 'Save Draft'}
                </button>
                <SchedulePicker scheduleDateTime={scheduleDateTime} setScheduleDateTime={setScheduleDateTime} show={showSchedulePicker}
                  onToggle={() => { if (!announcementId) { toast.error('Please save the draft first.'); return; } setShowSchedulePicker(!showSchedulePicker); }} />
                {showSchedulePicker && (
                  <button type="button" onClick={handleScheduleBroadcast} disabled={submitting}
                    className="flex items-center px-3 py-1.5 rounded-sm text-xs font-medium text-on-primary bg-primary hover:bg-primary-deep transition-colors disabled:opacity-50 cursor-pointer">
                    <Clock className="w-3.5 h-3.5 mr-1" /> Confirm Schedule
                  </button>
                )}
              </div>
              <button type="submit" disabled={submitting || uploading}
                className="flex items-center justify-center py-2 px-6 border border-transparent rounded-sm shadow-sm text-sm font-medium text-on-primary bg-primary hover:bg-primary-deep focus:outline-none transition-colors duration-150 cursor-pointer disabled:opacity-50">
                <Send className="w-4 h-4 mr-2" />{submitting ? 'Dispatching...' : 'Broadcast Notice'}
              </button>
            </div>
          </div>
        </form>

        <PreviewPanel compiledMessage={getCompiledMessage} previewTab={previewTab} onTabChange={setPreviewTab} uploadedFiles={uploadedFiles} />
      </div>

      <ConfirmBroadcastModal show={showConfirmModal} platformCount={selectedPlatforms.length} submitting={submitting}
        onClose={() => setShowConfirmModal(false)} onConfirm={handleSendBroadcast} />
      <LibraryModal show={showLibraryModal} onClose={() => setShowLibraryModal(false)} onAttach={handleAttachFromLibrary}
        uploadedFiles={uploadedFiles} onPreview={handlePreview} />
      <LightboxPreviewModal previewFile={previewFile} previewUrl={previewUrl} previewLoading={previewLoading}
        previewTextContent={previewTextContent} previewTextError={previewTextError}
        onClose={() => { setPreviewFile(null); setPreviewUrl(null); }} />
      <AIDraftModal show={showAIModal} aiPrompt={aiPrompt} onPromptChange={setAiPrompt} aiDrafting={aiDrafting}
        generatedDraft={generatedDraft} onGenerate={handleGenerateAIDraft}
        onUseDraft={() => { setCustomText(generatedDraft); const firstLine = generatedDraft.split('\n')[0]; if (firstLine.startsWith('📢')) { const cleanTitle = firstLine.replace(/📢\s*\**\s*/, '').replace(/\**$/, '').trim(); if (cleanTitle) handleTitleChange(0, cleanTitle); } setShowAIModal(false); setAiPrompt(''); setGeneratedDraft(''); toast.success('Draft loaded into editor!'); }}
        onClose={() => { setShowAIModal(false); setAiPrompt(''); setGeneratedDraft(''); }} />
    </div>
  );
};

export default AnnouncementForm;
