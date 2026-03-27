import http from 'k6/http';
import { check, group, sleep } from 'k6';

// Trend Hijacker v2.0 Ramp Test
// Ramp from 100 to 1000 users over 20 minutes

export const options = {
  stages: [
    { duration: '2m', target: 50 }, // Warm up
    { duration: '18m', target: 1000 }, // Ramp to 1000 concurrent users
    { duration: '5m', target: 1000 }, // Sustain at peak
    { duration: '5m', target: 0 }, // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:/api/trends}': ['p(95)<100'],
    'http_req_duration{endpoint:/api/trends/:id}': ['p(95)<150'],
    'http_req_duration{endpoint:/api/search}': ['p(95)<300'],
  },
  ext: {
    loadimpact: {
      projectID: 3346868,
      name: 'Trend Hijacker Ramp Test',
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
    tags: { name: 'TrendHijackerRamp' },
  };

  group('GET /api/trends (paginated)', () => {
    const limit = Math.floor(Math.random() * 50) + 10; // 10-60 items
    const offset = Math.floor(Math.random() * 10) * limit;

    const response = http.get(
      `${BASE_URL}/api/trends?limit=${limit}&offset=${offset}`,
      {
        ...params,
        tags: { ...params.tags, endpoint: '/api/trends' },
      }
    );

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time acceptable': (r) => r.timings.duration < 200,
      'has pagination': (r) => {
        try {
          return JSON.parse(r.body).pagination !== undefined;
        } catch {
          return false;
        }
      },
    });

    sleep(Math.random() + 0.5);
  });

  group('GET /api/trends/:id (detail + discussions)', () => {
    const trendsRes = http.get(`${BASE_URL}/api/trends?limit=5`, params);

    try {
      const trends = JSON.parse(trendsRes.body).data;
      if (trends && trends.length > 0) {
        const randomTrend = trends[Math.floor(Math.random() * trends.length)];

        const response = http.get(`${BASE_URL}/api/trends/${randomTrend.id}`, {
          ...params,
          tags: { ...params.tags, endpoint: '/api/trends/:id' },
        });

        check(response, {
          'status is 200': (r) => r.status === 200,
          'response time acceptable': (r) => r.timings.duration < 200,
          'has full trend data': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.id && body.title && body.summary;
            } catch {
              return false;
            }
          },
        });
      }
    } catch (e) {
      console.error('Error fetching trends:', e);
    }

    sleep(Math.random() + 1);
  });

  group('POST /api/search (various queries)', () => {
    const queries = [
      'artificial intelligence',
      'machine learning',
      'blockchain',
      'web3',
      'metaverse',
      'remote work',
      'quantum computing',
      'sustainable energy',
      'cryptocurrency',
      'NFT',
    ];

    const query = queries[Math.floor(Math.random() * queries.length)];

    const payload = JSON.stringify({
      query,
      filters: {
        status: ['emerging', 'growing'],
        minScore: Math.random() * 5 + 5,
      },
      limit: Math.floor(Math.random() * 50) + 10,
      offset: 0,
    });

    const response = http.post(`${BASE_URL}/api/search`, payload, {
      ...params,
      tags: { ...params.tags, endpoint: '/api/search' },
    });

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time acceptable': (r) => r.timings.duration < 300,
      'has results': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body).results);
        } catch {
          return false;
        }
      },
    });

    sleep(Math.random() + 0.5);
  });

  group('GET /api/alerts (user-specific)', () => {
    const response = http.get(`${BASE_URL}/api/alerts?limit=20&status=unread`, {
      ...params,
      tags: { ...params.tags, endpoint: '/api/alerts' },
    });

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time acceptable': (r) => r.timings.duration < 100,
    });

    sleep(Math.random() + 1);
  });

  group('POST /api/collections/:id/trends (save to collection)', () => {
    // This simulates users saving trends
    const collectionId = `collection-${Math.floor(Math.random() * 100)}`;
    const trendId = `trend-${Math.floor(Math.random() * 10000)}`;

    const payload = JSON.stringify({
      trendId,
      notes: 'Interesting trend',
    });

    const response = http.post(
      `${BASE_URL}/api/collections/${collectionId}/trends`,
      payload,
      {
        ...params,
        tags: { ...params.tags, endpoint: '/api/collections/:id/trends' },
      }
    );

    check(response, {
      'status is 2xx': (r) => r.status >= 200 && r.status < 300,
      'response time acceptable': (r) => r.timings.duration < 150,
    });

    sleep(Math.random() + 1);
  });

  // Random think time between 0.5-2 seconds
  sleep(Math.random() * 1.5 + 0.5);
}

export function teardown(data) {
  console.log('Ramp test completed - ramped to 1000 concurrent users');
}
