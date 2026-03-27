import http from 'k6/http';
import { check, group, sleep } from 'k6';

// Trend Hijacker v2.0 Baseline Load Test
// 100 concurrent users for 10 minutes

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Warm up
    { duration: '8m', target: 100 }, // Ramp to 100 concurrent users
    { duration: '0m', target: 100 }, // Hold at 100
  ],
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<500'],
    http_req_failed: ['rate<0.001'],
    'http_req_duration{endpoint:/api/trends}': ['p(95)<50'],
    'http_req_duration{endpoint:/api/trends/:id}': ['p(95)<75'],
    'http_req_duration{endpoint:/api/search}': ['p(95)<200'],
  },
  ext: {
    loadimpact: {
      projectID: 3346868,
      name: 'Trend Hijacker Baseline Test',
    },
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Setup auth headers
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN || 'test-token'}`,
    },
    tags: { name: 'TrendHijackerBaseline' },
  };

  group('GET /api/trends', () => {
    const response = http.get(`${BASE_URL}/api/trends?limit=20&offset=0`, {
      ...params,
      tags: { ...params.tags, endpoint: '/api/trends' },
    });

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 50ms': (r) => r.timings.duration < 50,
      'has pagination': (r) => JSON.parse(r.body).pagination !== undefined,
      'has data array': (r) => Array.isArray(JSON.parse(r.body).data),
    });

    sleep(1);
  });

  group('GET /api/trends/:id', () => {
    // Fetch a trend first to get a valid ID
    const trendsRes = http.get(`${BASE_URL}/api/trends?limit=1`, params);
    const trend = JSON.parse(trendsRes.body).data[0];

    if (trend) {
      const response = http.get(`${BASE_URL}/api/trends/${trend.id}`, {
        ...params,
        tags: { ...params.tags, endpoint: '/api/trends/:id' },
      });

      check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 75ms': (r) => r.timings.duration < 75,
        'has trend data': (r) => JSON.parse(r.body).id !== undefined,
        'has discussions': (r) => Array.isArray(JSON.parse(r.body).discussions),
      });
    }

    sleep(1);
  });

  group('POST /api/search', () => {
    const payload = JSON.stringify({
      query: 'artificial intelligence',
      filters: {
        status: ['emerging', 'growing'],
        minScore: 7,
      },
      limit: 50,
    });

    const response = http.post(`${BASE_URL}/api/search`, payload, {
      ...params,
      tags: { ...params.tags, endpoint: '/api/search' },
    });

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 200ms': (r) => r.timings.duration < 200,
      'has results': (r) => Array.isArray(JSON.parse(r.body).results),
      'results not empty': (r) => JSON.parse(r.body).results.length > 0,
    });

    sleep(1);
  });

  group('POST /api/trends/:id/generate-ideas', () => {
    // Fetch a trend first
    const trendsRes = http.get(`${BASE_URL}/api/trends?limit=1`, params);
    const trend = JSON.parse(trendsRes.body).data[0];

    if (trend) {
      const payload = JSON.stringify({
        style: 'practical',
        count: 5,
      });

      const response = http.post(
        `${BASE_URL}/api/trends/${trend.id}/generate-ideas`,
        payload,
        {
          ...params,
          tags: { ...params.tags, endpoint: '/api/trends/:id/generate-ideas' },
        }
      );

      check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
        'has ideas array': (r) => Array.isArray(JSON.parse(r.body).ideas),
      });
    }

    sleep(2); // Longer pause after heavy operation
  });

  // Random sleep between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

export function teardown(data) {
  console.log('Baseline test completed');
}
