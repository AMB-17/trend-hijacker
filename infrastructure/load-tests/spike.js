import http from 'k6/http';
import { check, group, sleep } from 'k6';

// Trend Hijacker v2.0 Spike Test
// Hold 100 users, spike to 500 for 5 minutes

export const options = {
  stages: [
    { duration: '2m', target: 50 }, // Warm up
    { duration: '5m', target: 100 }, // Ramp to 100 users
    { duration: '5m', target: 500 }, // Spike to 500
    { duration: '5m', target: 500 }, // Hold spike
    { duration: '2m', target: 100 }, // Return to baseline
    { duration: '1m', target: 0 }, // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<1000'],
    http_req_failed: ['rate<0.02'],
    'http_req_duration{phase:baseline}': ['p(95)<100'],
    'http_req_duration{phase:spike}': ['p(95)<300'],
  },
  ext: {
    loadimpact: {
      projectID: 3346868,
      name: 'Trend Hijacker Spike Test',
    },
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Determine current phase based on time
function getCurrentPhase() {
  // Approximate - actual values depend on k6's internal timing
  return __VU <= 100 ? 'baseline' : 'spike';
}

export default function () {
  const phase = getCurrentPhase();
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN || 'test-token'}`,
    },
    tags: {
      name: 'TrendHijackerSpike',
      phase,
    },
  };

  group('Read operations (trends)', () => {
    // This simulates the most common operation
    const response = http.get(`${BASE_URL}/api/trends?limit=20&offset=0`, {
      ...params,
      tags: { ...params.tags, endpoint: '/api/trends' },
    });

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time acceptable': (r) => {
        if (phase === 'baseline') {
          return r.timings.duration < 100;
        } else {
          return r.timings.duration < 300;
        }
      },
      'has data': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body).data);
        } catch {
          return false;
        }
      },
    });

    sleep(Math.random() * 0.5 + 0.5);
  });

  group('Trend detail with discussions', () => {
    const trendsRes = http.get(`${BASE_URL}/api/trends?limit=3`, params);

    try {
      const trends = JSON.parse(trendsRes.body).data;
      if (trends && trends.length > 0) {
        const trend = trends[Math.floor(Math.random() * trends.length)];

        const response = http.get(`${BASE_URL}/api/trends/${trend.id}`, {
          ...params,
          tags: { ...params.tags, endpoint: '/api/trends/:id' },
        });

        check(response, {
          'status is 200': (r) => r.status === 200,
          'response time acceptable': (r) => {
            if (phase === 'baseline') {
              return r.timings.duration < 100;
            } else {
              return r.timings.duration < 300;
            }
          },
        });
      }
    } catch (e) {
      console.error('Error in trend detail:', e);
    }

    sleep(Math.random() + 1);
  });

  group('Search operations', () => {
    const payload = JSON.stringify({
      query: 'AI technology',
      filters: { status: ['emerging', 'growing'] },
      limit: 20,
    });

    const response = http.post(`${BASE_URL}/api/search`, payload, {
      ...params,
      tags: { ...params.tags, endpoint: '/api/search' },
    });

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time acceptable': (r) => {
        if (phase === 'baseline') {
          return r.timings.duration < 200;
        } else {
          return r.timings.duration < 500;
        }
      },
    });

    sleep(Math.random() * 0.5 + 1);
  });

  group('Write operations (save trend)', () => {
    // Less frequent than reads
    if (Math.random() < 0.3) {
      const payload = JSON.stringify({
        trendId: `trend-${Math.floor(Math.random() * 10000)}`,
        notes: 'Interesting opportunity',
      });

      const response = http.post(
        `${BASE_URL}/api/saved-trends`,
        payload,
        {
          ...params,
          tags: { ...params.tags, endpoint: '/api/saved-trends' },
        }
      );

      check(response, {
        'status is 2xx': (r) => r.status >= 200 && r.status < 300,
        'response time acceptable': (r) => {
          if (phase === 'baseline') {
            return r.timings.duration < 150;
          } else {
            return r.timings.duration < 400;
          }
        },
      });
    }

    sleep(Math.random() * 1.5 + 1);
  });

  // Monitor error rate increase during spike
  group('Error rate monitoring', () => {
    const response = http.get(`${BASE_URL}/api/health`, params);

    check(response, {
      'health check ok': (r) => r.status === 200,
    });
  });

  sleep(Math.random() + 1);
}

export function teardown(data) {
  console.log('Spike test completed - tested system behavior under spike');
}
