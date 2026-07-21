import { createPortal } from 'react-dom';
import { Filter, X } from 'lucide-react';
import CustomSelect from '../ui/custom-select';

interface CourseItem {
  id: number;
  course_id: string;
  [key: string]: any;
}

interface DashboardFiltersDrawerProps {
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  setPage: (page: number | ((prev: number) => number)) => void;
  courseFilter: string;
  setCourseFilter: (filter: string) => void;
  dateFrom: string;
  setDateFrom: (date: string) => void;
  dateTo: string;
  setDateTo: (date: string) => void;
  courses: CourseItem[];
  clearFilters: () => void;
}

export default function DashboardFiltersDrawer({
  filtersOpen, setFiltersOpen,
  statusFilter, setStatusFilter, setPage,
  courseFilter, setCourseFilter,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  courses, clearFilters
}: DashboardFiltersDrawerProps) {
  if (!filtersOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-end justify-center z-50 md:hidden" onClick={() => setFiltersOpen(false)}>
      <div className="bg-canvas border-t border-hairline rounded-t-xl w-full max-h-[80vh] flex flex-col p-6 space-y-4 shadow-xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-primary" /><h3 className="text-sm font-semibold text-ink">Filter Broadcasts</h3></div>
          <button onClick={() => setFiltersOpen(false)} className="p-1 hover:bg-canvas-soft rounded"><X className="w-4 h-4 text-ink-mute" /></button>
        </div>
        <div className="space-y-4 overflow-y-auto pb-6">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-ink-mute tracking-wider">Status</label>
            <CustomSelect
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setPage(1); }}
              placeholder="All Status"
              options={[
                { value: '', label: 'All Status' },
                { value: 'draft', label: 'Draft' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'sending', label: 'Sending' },
                { value: 'sent', label: 'Delivered' },
                { value: 'partial', label: 'Partial' },
                { value: 'failed', label: 'Failed' },
              ]}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-ink-mute tracking-wider">Course</label>
            <CustomSelect
              value={courseFilter}
              onChange={(val) => { setCourseFilter(val); setPage(1); }}
              placeholder="All Courses"
              options={[
                { value: '', label: 'All Courses' },
                ...courses.map((c: CourseItem) => ({ value: String(c.id), label: c.course_id })),
              ]}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-ink-mute tracking-wider">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={dateFrom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDateFrom(e.target.value); setPage(1); }}
                className="block w-full px-3 py-2 border border-hairline rounded-sm text-xs text-ink bg-canvas focus:outline-none" title="From date" />
              <input type="date" value={dateTo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDateTo(e.target.value); setPage(1); }}
                className="block w-full px-3 py-2 border border-hairline rounded-sm text-xs text-ink bg-canvas focus:outline-none" title="To date" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2 border-t border-hairline">
          <button onClick={() => { clearFilters(); setFiltersOpen(false); }}
            className="flex-1 py-2 border border-hairline rounded-sm text-xs font-semibold text-accent-tomato hover:bg-accent-tomato/5">Clear Filters</button>
          <button onClick={() => setFiltersOpen(false)}
            className="flex-1 py-2 bg-primary hover:bg-primary-deep text-white rounded-sm text-xs font-semibold">Apply Filters</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
