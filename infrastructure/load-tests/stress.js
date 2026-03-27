import http from 'k6/http';
import { check, group, sleep } from 'k6';

// Trend Hijacker v2.0 Stress Test
// Increment by 100 users every 2 minutes until failure

export const options = {
  stages: [
    { duration: '2m', target: 50 }, // Warm up
    { duration: '2m', target: 100 }, // 100 users
    { duration: '2m', target: 200 }, // 200 users
    { duration: '2m', target: 300 }, // 300 users
    { duration: '2m', target: 400 }, // 400 users
    { duration: '2m', target: 500 }, // 500 users
    { duration: '2m', target: 600 }, // 600 users
    { duration: '2m', target: 700 }, // 700 users
    { duration: '2m', target: 800 }, // 800 users
    { duration: '2m', target: 900 }, // 900 users
    { duration: '2m', target: 1000 }, // 1000 users
    { duration: '2m', target: 1100 }, // 1100 users (stress point)
    { duration: '2m', target: 1200 }, // 1200 users (stress point)
    { duration: '5m', target: 0 }, // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<2000'],
    http_req_failed: ['rate<0.1'], // Allow up to 10% failure during stress
    'http_req_duration{severity:critical}': ['p(95)<1000'],
  },
  ext: {
    loadimpact: {
      projectID: 3346868,
      name: 'Trend Hijacker Stress Test',
    },
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN || 'test-token'}`,
    },
    tags: { name: 'TrendHijackerStress' },
    timeout: '10s',
  };

  // Determine stress level based on VU count
  const stressLevel = __VU <= 500 ? 'low' : __VU <= 900 ? 'medium' : 'high';

  group('Critical path: trends list', () => {
    const response = http.get(`${BASE_URL}/api/trends?limit=20`, {
      ...params,
      tags: {
        ...params.tags,
        endpoint: '/api/trends',
        severity: 'critical',
      },
    });

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time acceptable': (r) => {
        if (stressLevel === 'low') return r.timings.duration < 100;
        if (stressLevel === 'medium') return r.timings.duration < 300;
        return r.timings.duration < 500;
      },
      'not timeout': (r) => r.status !== 0,
    });

    sleep(Math.random() * 0.3 + 0.3);
  });

  group('Critical path: trend detail', () => {
    const trendsRes = http.get(`${BASE_URL}/api/trends?limit=1`, params);

    try {
      const trends = JSON.parse(trendsRes.body).data;
      if (trends && trends.length > 0) {
        const response = http.get(`${BASE_URL}/api/trends/${trends[0].id}`, {
          ...params,
          tags: {
            ...params.tags,
            endpoint: '/api/trends/:id',
            severity: 'critical',
          },
        });

        check(response, {
          'status is 200': (r) => r.status === 200,
          'response time acceptable': (r) => {
            if (stressLevel === 'low') return r.timings.duration < 150;
            if (stressLevel === 'medium') return r.timings.duration < 400;
            return r.timings.duration < 800;
          },
          'not timeout': (r) => r.status !== 0,
        });
      }
    } catch (e) {
      console.warn('Error fetching trend for detail:', e);
    }

    sleep(Math.random() * 0.5 + 0.5);
  });

  group('High-load search', () => {
    const payload = JSON.stringify({
      query: 'innovation',
      filters: { minScore: 5 },
      limit: 50,
    });

    const response = http.post(`${BASE_URL}/api/search`, payload, {
      ...params,
      tags: {
        ...params.tags,
        endpoint: '/api/search',
        severity: 'high',
      },
    });

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time acceptable': (r) => {
        if (stressLevel === 'low') return r.timings.duration < 300;
        if (stressLevel === 'medium') return r.timings.duration < 600;
        return r.timings.duration < 1000;
      },
      'not timeout': (r) => r.status !== 0,
    });

    sleep(Math.random() * 0.3 + 0.5);
  });

  group('Database stress: aggregations', () => {
    // This simulates heavy analytical queries
    if (Math.random() < 0.2) {
      const response = http.get(`${BASE_URL}/api/analytics/trends-by-category`, {
        ...params,
        tags: {
          ...params.tags,
          endpoint: '/api/analytics/trends-by-category',
        },
      });

      check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 2s': (r) => r.timings.duration < 2000,
      });
    }

    sleep(Math.random() + 1);
  });

  group('Connection pool stress', () => {
    // Make multiple requests in quick succession to stress connection pool
    const responses = http.batch([
      ['GET', `${BASE_URL}/api/trends?limit=5`],
      ['GET', `${BASE_URL}/api/alerts?limit=5`],
      ['GET', `${BASE_URL}/api/saved-trends?limit=5`],
    ]);

    responses.forEach((r) => {
      check(r, {
        'status is 200': (res) => res.status === 200,
        'not timeout': (res) => res.status !== 0,
      });
    });

    sleep(Math.random() * 0.2 + 0.5);
  });

  // Adaptive think time based on stress level
  if (stressLevel === 'low') {
    sleep(Math.random() + 1);
  } else if (stressLevel === 'medium') {
    sleep(Math.random() * 0.5 + 0.5);
  } else {
    sleep(Math.random() * 0.2 + 0.2);
  }
}

export function teardown(data) {
  console.log('Stress test completed');
  console.log('Stress test ramped up to identify breaking point');
  console.log('Review results for breaking point and degradation patterns');
}
