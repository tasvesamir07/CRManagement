const counters = {
  httpRequestsTotal: { help: 'Total HTTP requests', labels: ['method', 'path', 'status'], values: {} },
  httpRequestDurationMs: { help: 'HTTP request duration (bucketed in ms)', labels: ['method', 'path'], buckets: [5, 10, 50, 100, 200, 500, 1000, 5000], values: {} },
  wsConnectionsTotal: { help: 'Total WebSocket connections', labels: [], value: 0 },
  wsConnectionsCurrent: { help: 'Current active WebSocket connections', labels: [], value: 0 },
  dbQueriesTotal: { help: 'Total database queries', labels: ['type'], values: { select: 0, insert: 0, update: 0, delete: 0, other: 0 } },
  dbErrorsTotal: { help: 'Total database query errors', labels: [], value: 0 },
  dbSlowQueriesTotal: { help: 'Total slow database queries (>500ms)', labels: [], value: 0 },
  storageUploadsTotal: { help: 'Total file uploads', labels: ['backend'], values: {} },
  storageDownloadsTotal: { help: 'Total file downloads', labels: ['backend'], values: {} },
  storageDeletesTotal: { help: 'Total file deletions', labels: ['backend'], values: {} },
  announcementsSentTotal: { help: 'Total announcements sent', labels: [], value: 0 },
};

function labelKey(metric, labelVals) {
  if (!metric.labels || metric.labels.length === 0) return '';
  return labelVals.join('|');
}

function inc(metricName, ...labelVals) {
  const m = counters[metricName];
  if (!m) return;
  if (m.labels.length === 0) { m.value = (m.value || 0) + 1; return; }
  const key = labelKey(m, labelVals);
  m.values[key] = (m.values[key] || 0) + 1;
}

function set(metricName, val, ...labelVals) {
  const m = counters[metricName];
  if (!m) return;
  if (m.labels.length === 0) { m.value = val; return; }
  const key = labelKey(m, labelVals);
  m.values[key] = val;
}

function observe(metricName, durationMs, ...labelVals) {
  const m = counters[metricName];
  if (!m || !m.buckets) return;
  const key = labelKey(m, labelVals);
  m.values[key] = m.values[key] || {};
  const bucketCount = m.values[key];
  for (const bucket of m.buckets) {
    bucketCount[bucket] = (bucketCount[bucket] || 0) + (durationMs <= bucket ? 1 : 0);
  }
  bucketCount['+Inf'] = (bucketCount['+Inf'] || 0) + 1;
  bucketCount['_sum'] = (bucketCount['_sum'] || 0) + durationMs;
  bucketCount['_count'] = (bucketCount['_count'] || 0) + 1;
}

function dbQueryType(text) {
  const t = text.trim().split(/\s+/)[0].toLowerCase();
  if (['select', 'insert', 'update', 'delete'].includes(t)) return t;
  return 'other';
}

function formatMetrics() {
  const lines = [];

  for (const [name, metric] of Object.entries(counters)) {
    lines.push(`# HELP ${name} ${metric.help}`);
    lines.push(`# TYPE ${name} ${metric.buckets ? 'histogram' : 'counter'}`);
    if (metric.labels.length === 0) {
      lines.push(`${name} ${metric.value || 0}`);
    } else if (metric.buckets) {
      for (const [key, buckets] of Object.entries(metric.values)) {
        const labelStr = key ? `{${metric.labels.map((l, i) => `${l}="${key.split('|')[i]}"`).join(',')}}` : '';
        for (const [bucket, count] of Object.entries(buckets)) {
          if (bucket === '_sum' || bucket === '_count') continue;
          lines.push(`${name}_bucket${labelStr}{le="${bucket}"} ${count}`);
        }
        lines.push(`${name}_bucket${labelStr}{le="+Inf"} ${buckets['+Inf'] || 0}`);
        lines.push(`${name}_sum${labelStr} ${buckets['_sum'] || 0}`);
        lines.push(`${name}_count${labelStr} ${buckets['_count'] || 0}`);
      }
    } else {
      for (const [key, val] of Object.entries(metric.values)) {
        const labelStr = key ? `{${metric.labels.map((l, i) => `${l}="${key.split('|')[i]}"`).join(',')}}` : '';
        lines.push(`${name}${labelStr} ${val}`);
      }
    }
  }

  lines.push(`# HELP process_start_time_seconds Start time of the process`);
  lines.push(`# TYPE process_start_time_seconds gauge`);
  lines.push(`process_start_time_seconds ${Math.floor(Date.now() / 1000 - process.uptime())}`);

  lines.push(`# HELP process_memory_bytes Process memory usage`);
  lines.push(`# TYPE process_memory_bytes gauge`);
  const mem = process.memoryUsage();
  lines.push(`process_memory_bytes{type="rss"} ${mem.rss}`);
  lines.push(`process_memory_bytes{type="heapTotal"} ${mem.heapTotal}`);
  lines.push(`process_memory_bytes{type="heapUsed"} ${mem.heapUsed}`);

  lines.push(`# HELP process_cpu_seconds_total Process CPU time`);
  lines.push(`# TYPE process_cpu_seconds_total counter`);
  const cpu = process.cpuUsage();
  lines.push(`process_cpu_seconds_total ${(cpu.user + cpu.system) / 1e6}`);

  return lines.join('\n');
}

module.exports = { inc, set, observe, dbQueryType, formatMetrics };
