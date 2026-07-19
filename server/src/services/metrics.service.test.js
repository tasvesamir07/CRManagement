const { inc, set, observe, dbQueryType, formatMetrics } = require('./metrics.service');

describe('Metrics Service', () => {
  afterEach(() => {
    formatMetrics();
  });

  describe('inc', () => {
    it('should increment a simple counter', () => {
      inc('wsConnectionsTotal');
      inc('wsConnectionsTotal');
      const output = formatMetrics();
      expect(output).toContain('wsConnectionsTotal 2');
    });

    it('should increment a labeled counter', () => {
      inc('httpRequestsTotal', 'GET', '/api/test', '200');
      inc('httpRequestsTotal', 'GET', '/api/test', '200');
      const output = formatMetrics();
      expect(output).toContain('httpRequestsTotal{method="GET",path="/api/test",status="200"} 2');
    });

    it('should handle unknown metric names silently', () => {
      expect(() => inc('unknown')).not.toThrow();
    });
  });

  describe('set', () => {
    it('should set a simple gauge', () => {
      set('wsConnectionsCurrent', 5);
      const output = formatMetrics();
      expect(output).toContain('wsConnectionsCurrent 5');
    });

    it('should set a labeled gauge', () => {
      set('storageUploadsTotal', 10, 's3');
      const output = formatMetrics();
      expect(output).toContain('storageUploadsTotal{backend="s3"} 10');
    });
  });

  describe('observe', () => {
    it('should record a duration in buckets', () => {
      observe('httpRequestDurationMs', 45, 'GET', '/api/test');
      const output = formatMetrics();
      expect(output).toContain('le="50"} 1');
      expect(output).toContain('_sum{method="GET",path="/api/test"} 45');
      expect(output).toContain('_count{method="GET",path="/api/test"} 1');
    });
  });

  describe('dbQueryType', () => {
    it('should classify SELECT queries', () => {
      expect(dbQueryType('SELECT * FROM users')).toBe('select');
    });
    it('should classify INSERT queries', () => {
      expect(dbQueryType('INSERT INTO users (id) VALUES (1)')).toBe('insert');
    });
    it('should classify UPDATE queries', () => {
      expect(dbQueryType('UPDATE users SET name = $1')).toBe('update');
    });
    it('should classify DELETE queries', () => {
      expect(dbQueryType('DELETE FROM users WHERE id = $1')).toBe('delete');
    });
    it('should classify other queries as other', () => {
      expect(dbQueryType('CREATE TABLE test (id INT)')).toBe('other');
    });
    it('should handle leading whitespace', () => {
      expect(dbQueryType('  SELECT * FROM users')).toBe('select');
    });
  });

  describe('formatMetrics', () => {
    it('should produce valid Prometheus output', () => {
      inc('httpRequestsTotal', 'POST', '/api/announcements', '201');
      observe('httpRequestDurationMs', 150, 'POST', '/api/announcements');
      set('wsConnectionsCurrent', 3);
      const output = formatMetrics();
      expect(output).toContain('# HELP httpRequestsTotal Total HTTP requests');
      expect(output).toContain('# TYPE httpRequestsTotal counter');
      expect(output).toContain('# HELP process_start_time_seconds');
      expect(output).toContain('# HELP process_memory_bytes');
    });
  });
});
