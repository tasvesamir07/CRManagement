import { Edit2, Trash2, Flag, FlagOff, Link as LinkIcon } from 'lucide-react';

const ChannelCard = ({ platform, waStatus, tgStatus, messengerStatus,
  courseDefaults, courses, settingDefault, onEdit, onDelete, onSetDefault }) => {

  const isOnline = platform.platform_type === 'whatsapp'
    ? waStatus === 'CONNECTED'
    : platform.platform_type === 'telegram'
      ? tgStatus === 'CONNECTED'
      : messengerStatus === 'CONNECTED';
  const isConfigured = platform.service_available !== false;

  const isDefaultForCourse = (platformId, courseId) => {
    return courseDefaults[courseId]?.includes(platformId) || false;
  };

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.course_name : 'Unknown Course';
  };

  return (
    <div className={`p-4 border rounded-sm transition-all flex flex-col justify-between ${
      platform.is_active ? 'border-hairline hover:border-hairline-strong' : 'border-hairline-cool bg-canvas-soft/50'
    }`}>
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              !isConfigured ? 'bg-accent-yellow' : isOnline ? 'bg-primary' : 'bg-ink-mute'
            }`} />
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
              platform.platform_type === 'whatsapp'
                ? 'bg-primary/15 text-primary-deep'
                : platform.platform_type === 'telegram'
                  ? 'bg-accent-violet/15 text-accent-violet'
                  : 'bg-blue-600/15 text-blue-700'
            }`}>
              {platform.platform_type}
            </span>
            {!isConfigured ? (
              <span className="text-[10px] font-medium text-accent-yellow" title="Service not configured">
                {platform.platform_type === 'whatsapp' ? 'Disconnected' : platform.platform_type === 'telegram' ? 'No Token' : 'No Session'}
              </span>
            ) : isOnline ? (
              <span className="text-[10px] font-medium text-primary">Active</span>
            ) : (
              <span className="text-[10px] font-medium text-ink-mute">Offline</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {platform.course_id && courses.length > 0 && (
              <button onClick={() => onSetDefault(platform.id, platform.course_id)}
                disabled={settingDefault === platform.id}
                className={`text-ink-mute hover:text-emerald-600 p-1 rounded hover:bg-emerald-50 transition-colors cursor-pointer ${isDefaultForCourse(platform.id, platform.course_id) ? 'text-emerald-600' : ''}`}
                title={isDefaultForCourse(platform.id, platform.course_id) ? 'Remove from course defaults' : 'Set as course default'}>
                {isDefaultForCourse(platform.id, platform.course_id) ? <Flag className="w-4 h-4 fill-current" /> : <FlagOff className="w-4 h-4" />}
              </button>
            )}
            <button onClick={() => onEdit(platform)}
              className="text-ink-mute hover:text-primary p-1 rounded hover:bg-primary/10 transition-colors cursor-pointer" title="Edit">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(platform.id)}
              className="text-ink-mute hover:text-accent-tomato p-1 rounded hover:bg-accent-tomato/10 transition-colors cursor-pointer" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <h4 className={`text-md font-semibold mt-2.5 truncate ${platform.is_active ? 'text-ink' : 'text-ink-mute'}`}>{platform.platform_name}</h4>
        {platform.description && <p className="text-xs text-ink-mute mt-1">{platform.description}</p>}
        {platform.course_id && (
          <p className="text-xs text-primary mt-1 flex items-center gap-1">
            <Flag className="w-3 h-3" />
            Default for: {getCourseName(platform.course_id)}
          </p>
        )}
      </div>
      <div className="mt-4 pt-2 border-t border-hairline-cool flex items-center justify-between text-[11px] font-mono text-ink-mute">
        <span className="truncate max-w-[170px]" title={platform.chat_id}>{platform.chat_id}</span>
        <LinkIcon className="w-3.5 h-3.5 text-hairline-strong" />
      </div>
    </div>
  );
};

export default ChannelCard;
