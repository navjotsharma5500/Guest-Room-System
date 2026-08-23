// controllers/analyticsController.js
// Fetches real data from Google Analytics 4 Data API
// Uses Service Account credentials stored in environment variables
// GA4 Data API requests use the numeric property resource from GA4_PROPERTY_ID.

import fetch from 'node-fetch';
import {
  buildScheduledAnalyticsReportPackage,
  sendScheduledAnalyticsReport,
} from '../utils/analyticsEmailReports.js';

const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID; // e.g. "properties/123456789"
const GA4_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY; // full JSON string

// This GA4 property is shared by several products. Keep every report scoped to
// the two active React ecosystems and, in particular, never include the
// unrelated permissions.thapar.edu application.
const INCLUDED_GA4_HOSTS = [
  'campusconnect.thapar.edu',
  'studentsocieties.thapar.edu',
];

const ANALYTICS_SCOPES = {
  overall: { key: 'overall', label: 'Overall' },
  campusconnect: { key: 'campusconnect', label: 'Campus Connect' },
  societies: { key: 'societies', label: 'Student Societies' },
  permissions: { key: 'permissions', label: 'Society Night Permission' },
};

const APPLICATION_SCOPES = [
  ANALYTICS_SCOPES.campusconnect,
  ANALYTICS_SCOPES.societies,
  ANALYTICS_SCOPES.permissions,
];

const CAMPUS_CONNECT_HOST = INCLUDED_GA4_HOSTS[0];
const STUDENT_SOCIETIES_HOST = INCLUDED_GA4_HOSTS[1];
const PERMISSIONS_PATH = '/permissions';
const LEGACY_PERMISSION_SCREEN_NAME = 'NightPermi — Thapar Institute';

const stringFilter = (fieldName, value, matchType = 'EXACT', caseSensitive = false) => ({
  filter: {
    fieldName,
    stringFilter: { matchType, value, caseSensitive },
  },
});

const andFilters = (...expressions) => ({
  andGroup: { expressions: expressions.filter(Boolean) },
});

const orFilters = (...expressions) => ({
  orGroup: { expressions: expressions.filter(Boolean) },
});

const permissionPathFilter = () => orFilters(
  stringFilter('pagePath', PERMISSIONS_PATH, 'EXACT', true),
  stringFilter('pagePath', `${PERMISSIONS_PATH}/`, 'BEGINS_WITH', true)
);

const permissionScreenFilter = () => orFilters(
  stringFilter('unifiedScreenName', `${STUDENT_SOCIETIES_HOST}${PERMISSIONS_PATH}`, 'EXACT', true),
  stringFilter('unifiedScreenName', `${STUDENT_SOCIETIES_HOST}${PERMISSIONS_PATH}/`, 'BEGINS_WITH', true),
  stringFilter('unifiedScreenName', LEGACY_PERMISSION_SCREEN_NAME, 'EXACT', true)
);

export const resolveAnalyticsScope = (query = {}) => {
  const requestedScope = String(query.scope || 'overall').trim().toLowerCase();
  const scope = ANALYTICS_SCOPES[requestedScope];
  if (!scope) {
    const error = new Error('Invalid analytics scope. Use overall, campusconnect, societies, or permissions.');
    error.statusCode = 400;
    error.errorType = 'invalid_scope';
    throw error;
  }
  return scope;
};

export const buildHistoricalScopeFilter = (scopeKey = 'overall') => {
  switch (scopeKey) {
    case 'campusconnect':
      return stringFilter('hostName', CAMPUS_CONNECT_HOST);
    case 'societies':
      return andFilters(
        stringFilter('hostName', STUDENT_SOCIETIES_HOST),
        { notExpression: permissionPathFilter() }
      );
    case 'permissions':
      return andFilters(
        stringFilter('hostName', STUDENT_SOCIETIES_HOST),
        permissionPathFilter()
      );
    case 'overall':
    default:
      return orFilters(...INCLUDED_GA4_HOSTS.map(host => stringFilter('hostName', host)));
  }
};

export const buildRealtimeScopeFilter = (scopeKey = 'overall') => {
  const campusFilter = stringFilter('unifiedScreenName', CAMPUS_CONNECT_HOST, 'BEGINS_WITH');
  const societiesHostFilter = stringFilter('unifiedScreenName', STUDENT_SOCIETIES_HOST, 'BEGINS_WITH');

  switch (scopeKey) {
    case 'campusconnect':
      return campusFilter;
    case 'societies':
      return andFilters(societiesHostFilter, { notExpression: permissionScreenFilter() });
    case 'permissions':
      return permissionScreenFilter();
    case 'overall':
    default:
      // The exact legacy title is a compatibility exception for the existing
      // permission portal, whose realtime event does not carry hostname/path.
      return orFilters(campusFilter, societiesHostFilter, stringFilter('unifiedScreenName', LEGACY_PERMISSION_SCREEN_NAME));
  }
};

const combineFilters = (...expressions) => {
  const validExpressions = expressions.filter(Boolean);
  if (validExpressions.length === 1) return validExpressions[0];
  return andFilters(...validExpressions);
};

// ── Get Google OAuth2 access token from service account ──────────────────────
async function getGoogleAccessToken() {
  if (!GA4_SERVICE_ACCOUNT_KEY) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set in environment');

  let creds;
  try {
    creds = JSON.parse(GA4_SERVICE_ACCOUNT_KEY);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON');
  }

  // Create JWT for service account
  const now = Math.floor(Date.now() / 1000);
  const header  = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss:   creds.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  };

  const encode = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  // Sign with private key using Node.js crypto
  const { createSign } = await import('crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(unsignedToken);
  const signature = sign.sign(creds.private_key, 'base64url');
  const jwt = `${unsignedToken}.${signature}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(`Token error: ${tokenData.error_description || tokenData.error}`);
  return tokenData.access_token;
}

// ── Run GA4 Data API report ───────────────────────────────────────────────────
async function runGA4Report(accessToken, body, scopeFilter) {
  if (!GA4_PROPERTY_ID) throw new Error('GA4_PROPERTY_ID not set in environment');

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${GA4_PROPERTY_ID}:runReport`,
    {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        ...body,
        // Enforce the validated application scope centrally on every report.
        dimensionFilter: combineFilters(scopeFilter, body.dimensionFilter),
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`GA4 API error: ${JSON.stringify(data.error || data)}`);
  return data;
}

const getReportMetrics = (report, metricCount) => {
  const values = report?.totals?.[0]?.metricValues || report?.rows?.[0]?.metricValues || [];
  return Array.from({ length: metricCount }, (_, index) => Number(values[index]?.value || 0));
};

const getApplicationForPage = (domain, page = '/') => {
  if (domain === CAMPUS_CONNECT_HOST) return ANALYTICS_SCOPES.campusconnect;
  if (domain === STUDENT_SOCIETIES_HOST && (page === PERMISSIONS_PATH || page.startsWith(`${PERMISSIONS_PATH}/`))) {
    return ANALYTICS_SCOPES.permissions;
  }
  return ANALYTICS_SCOPES.societies;
};

const getApplicationForScreenName = (screenName = '') => {
  if (screenName === LEGACY_PERMISSION_SCREEN_NAME) {
    return { ...ANALYTICS_SCOPES.permissions, domain: STUDENT_SOCIETIES_HOST, page: PERMISSIONS_PATH };
  }
  if (screenName.startsWith(CAMPUS_CONNECT_HOST)) {
    return {
      ...ANALYTICS_SCOPES.campusconnect,
      domain: CAMPUS_CONNECT_HOST,
      page: screenName.slice(CAMPUS_CONNECT_HOST.length) || '/',
    };
  }
  if (screenName.startsWith(STUDENT_SOCIETIES_HOST)) {
    const page = screenName.slice(STUDENT_SOCIETIES_HOST.length) || '/';
    const application = getApplicationForPage(STUDENT_SOCIETIES_HOST, page);
    return { ...application, domain: STUDENT_SOCIETIES_HOST, page };
  }
  return { key: 'unknown', label: 'Unknown', domain: '', page: screenName || '/' };
};

const classifyGA4Error = (error) => {
  if (error.statusCode === 400) {
    return { status: 400, errorType: error.errorType || 'invalid_request' };
  }

  const message = String(error.message || 'Unknown analytics error');
  if (/not set in environment|not valid JSON|private.key/i.test(message)) {
    return { status: 503, errorType: 'not_configured' };
  }
  if (/Token error|GA4 API error|GA4 Realtime API error/i.test(message)) {
    return { status: 502, errorType: 'permission_or_api' };
  }
  if (/fetch|network|ENOTFOUND|ECONN|ETIMEDOUT|socket/i.test(message)) {
    return { status: 502, errorType: 'network' };
  }
  return { status: 500, errorType: 'unknown' };
};

const sendGA4Error = (res, error) => {
  const { status, errorType } = classifyGA4Error(error);
  return res.status(status).json({ configured: errorType !== 'not_configured', errorType, message: error.message });
};

async function runGA4RealtimeReport(accessToken, body, dimensionFilter) {
  if (!GA4_PROPERTY_ID) throw new Error('GA4_PROPERTY_ID not set in environment');
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${GA4_PROPERTY_ID}:runRealtimeReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, dimensionFilter }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`GA4 Realtime API error: ${JSON.stringify(data.error || data)}`);
  return data;
}

function resolveAnalyticsPeriod(query) {
  const requestedPeriod = String(query.period || '').toLowerCase();
  if (requestedPeriod === 'today') {
    return {
      period: 'today', days: null,
      dateRange: { startDate: 'today', endDate: 'today' },
      prevRange: { startDate: 'yesterday', endDate: 'yesterday' },
    };
  }
  const parsedDays = Number.parseInt(query.days || '30', 10);
  const days = [7, 30, 90].includes(parsedDays) ? parsedDays : 30;
  return {
    period: `${days}days`, days,
    dateRange: { startDate: `${days - 1}daysAgo`, endDate: 'today' },
    prevRange: { startDate: `${days * 2 - 1}daysAgo`, endDate: `${days}daysAgo` },
  };
}

// ── Parse GA4 report rows into simple objects ─────────────────────────────────
function parseRows(report, dimKeys, metKeys) {
  if (!report?.rows) return [];
  return report.rows.map(row => {
    const obj = {};
    (row.dimensionValues || []).forEach((v, i) => { obj[dimKeys[i]] = v.value; });
    (row.metricValues   || []).forEach((v, i) => { obj[metKeys[i]]  = Number(v.value); });
    return obj;
  });
}

const parseOverview = (overviewReport, overviewPrevReport) => {
  const ov = overviewReport?.totals?.[0]?.metricValues || overviewReport?.rows?.[0]?.metricValues || [];
  const ovPrev = overviewPrevReport?.totals?.[0]?.metricValues || overviewPrevReport?.rows?.[0]?.metricValues || [];

  return {
    sessions: Number(ov[0]?.value || 0),
    totalUsers: Number(ov[1]?.value || 0),
    newUsers: Number(ov[2]?.value || 0),
    bounceRate: parseFloat((Number(ov[3]?.value || 0) * 100).toFixed(1)),
    avgSessionDuration: Math.round(Number(ov[4]?.value || 0)),
    pageViews: Number(ov[5]?.value || 0),
    returningUsers: Math.max(0, Number(ov[1]?.value || 0) - Number(ov[2]?.value || 0)),
    prevSessions: Number(ovPrev[0]?.value || 0),
    prevUsers: Number(ovPrev[1]?.value || 0),
    prevPageViews: Number(ovPrev[2]?.value || 0),
  };
};

const parseHourly = report => parseRows(report, ['hour'], ['sessions'])
  .map(row => ({ hour: `${row.hour}:00`, sessions: row.sessions }));

const findPeakHour = hourly => hourly.reduce(
  (best, item) => item.sessions > (best?.sessions || 0) ? item : best,
  null
)?.hour || '—';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTROLLER — GET /api/analytics/ga4
// Returns all traffic metrics in a single call
// ═══════════════════════════════════════════════════════════════════════════════
export const getGA4Analytics = async (req, res) => {
  try {
    if (!GA4_PROPERTY_ID || !GA4_SERVICE_ACCOUNT_KEY) {
      return res.status(503).json({
        configured: false,
        errorType: 'not_configured',
        message: 'GA4 not configured. Set GA4_PROPERTY_ID and GOOGLE_SERVICE_ACCOUNT_KEY in .env',
      });
    }

    const scope = resolveAnalyticsScope(req.query);
    const accessToken = await getGoogleAccessToken();
    const scopeFilter = buildHistoricalScopeFilter(scope.key);
    const overallFilter = buildHistoricalScopeFilter('overall');
    const runScopedReport = body => runGA4Report(accessToken, body, scopeFilter);
    const { period, days, dateRange, prevRange } = resolveAnalyticsPeriod(req.query);

    // Run all reports in parallel
    const [
      overviewReport,
      overviewPrevReport,
      domainReport,
      pageViewsReport,
      sourceReport,
      deviceReport,
      browserReport,
      osReport,
      countryReport,
      hourReport,
      dailyReport,
    ] = await Promise.all([

      // Overview: sessions, users, new users, bounce rate, session duration
      runScopedReport({
        dateRanges: [dateRange],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'screenPageViews' },
        ],
      }),

      // Previous period for trend comparison
      runScopedReport({
        dateRanges: [prevRange],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
        ],
      }),

      // Traffic split across the included domains.
      runScopedReport({
        dateRanges: [dateRange],
        dimensions: [{ name: 'hostName' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      }),

      // Top pages across all included domains. Hostname disambiguates identical
      // paths such as "/" on the two ecosystems.
      runScopedReport({
        dateRanges: [dateRange],
        dimensions: [{ name: 'hostName' }, { name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'averageSessionDuration' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      }),

      // Traffic sources
      runScopedReport({
        dateRanges: [dateRange],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 8,
      }),

      // Device category
      runScopedReport({
        dateRanges: [dateRange],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
      }),

      // Browser
      runScopedReport({
        dateRanges: [dateRange],
        dimensions: [{ name: 'browser' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 6,
      }),

      // Operating system
      runScopedReport({
        dateRanges: [dateRange],
        dimensions: [{ name: 'operatingSystem' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 6,
      }),

      // Countries
      runScopedReport({
        dateRanges: [dateRange],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),

      // Hour of day (peak time)
      runScopedReport({
        dateRanges: [dateRange],
        dimensions: [{ name: 'hour' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'hour' } }],
      }),

      // Daily trend
      runScopedReport({
        dateRanges: [dateRange],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
    ]);

    const applicationReports = await Promise.all(APPLICATION_SCOPES.map(application =>
      runScopedReport({
        dateRanges: [dateRange],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }],
        dimensionFilter: buildHistoricalScopeFilter(application.key),
      })
    ));

    let overallOverviewReport = overviewReport;
    let overallOverviewPrevReport = overviewPrevReport;
    let overallDeviceReport = deviceReport;
    let overallHourReport = hourReport;

    if (scope.key !== 'overall') {
      [overallOverviewReport, overallOverviewPrevReport, overallDeviceReport, overallHourReport] = await Promise.all([
        runGA4Report(accessToken, {
          dateRanges: [dateRange],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'newUsers' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
            { name: 'screenPageViews' },
          ],
        }, overallFilter),
        runGA4Report(accessToken, {
          dateRanges: [prevRange],
          metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }],
        }, overallFilter),
        runGA4Report(accessToken, {
          dateRanges: [dateRange],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        }, overallFilter),
        runGA4Report(accessToken, {
          dateRanges: [dateRange],
          dimensions: [{ name: 'hour' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ dimension: { dimensionName: 'hour' } }],
        }, overallFilter),
      ]);
    }

    const overview = parseOverview(overviewReport, overviewPrevReport);

    // ── Parse other sections ──────────────────────────────────────────────────
    const domains     = parseRows(domainReport,     ['domain'],  ['sessions', 'users', 'pageViews']);
    const topPages    = parseRows(pageViewsReport,  ['domain', 'page'], ['views', 'avgDuration'])
      .map(row => {
        const application = getApplicationForPage(row.domain, row.page);
        return { ...row, applicationKey: application.key, application: application.label };
      });
    const sources     = parseRows(sourceReport,     ['source'],  ['sessions', 'users']);
    const devices     = parseRows(deviceReport,     ['device'],  ['sessions', 'users']);
    const browsers    = parseRows(browserReport,    ['browser'], ['sessions']);
    const oses        = parseRows(osReport,         ['os'],      ['sessions']);
    const countries   = parseRows(countryReport,    ['country'], ['sessions', 'users']);
    const hourly      = parseHourly(hourReport);
    const daily       = parseRows(dailyReport,      ['date'],    ['sessions', 'users', 'pageViews'])
      .map(r => ({
        date: `${r.date.slice(0,4)}-${r.date.slice(4,6)}-${r.date.slice(6,8)}`,
        sessions: r.sessions,
        users: r.users,
        pageViews: r.pageViews,
      }));

    const applications = applicationReports.map((report, index) => {
      const [sessions, users, pageViews] = getReportMetrics(report, 3);
      return { ...APPLICATION_SCOPES[index], sessions, users, pageViews };
    });
    const overallHourly = parseHourly(overallHourReport);
    const overall = {
      overview: parseOverview(overallOverviewReport, overallOverviewPrevReport),
      peakHour: findPeakHour(overallHourly),
      devices: parseRows(overallDeviceReport, ['device'], ['sessions', 'users']),
      hourly: overallHourly,
    };

    return res.json({
      configured: true,
      period,
      days,
      scope: scope.key,
      scopeLabel: scope.label,
      fetchedAt: new Date().toISOString(),
      overview,
      peakHour: findPeakHour(hourly),
      overall,
      includedDomains: INCLUDED_GA4_HOSTS,
      domains,
      applications,
      topPages,
      sources,
      devices,
      browsers,
      oses,
      countries,
      hourly,
      daily,
      hasData: overview.sessions > 0 || overview.totalUsers > 0 || overview.pageViews > 0 || daily.length > 0,
    });

  } catch (err) {
    console.error('GA4 Analytics error:', err.message);
    return sendGA4Error(res, err);
  }
};

// GET /api/analytics/ga4/realtime — genuine GA4 Realtime API data.
export const getGA4Realtime = async (req, res) => {
  try {
    if (!GA4_PROPERTY_ID || !GA4_SERVICE_ACCOUNT_KEY) {
      return res.status(503).json({
        configured: false,
        errorType: 'not_configured',
        message: 'GA4 not configured. Set GA4_PROPERTY_ID and GOOGLE_SERVICE_ACCOUNT_KEY in .env',
      });
    }

    const scope = resolveAnalyticsScope(req.query);
    const accessToken = await getGoogleAccessToken();
    const scopeFilter = buildRealtimeScopeFilter(scope.key);
    const overallFilter = buildRealtimeScopeFilter('overall');

    // Realtime supports unifiedScreenName, but not historical hostName/pagePath.
    // Current pages emit "hostname/path" titles; the permission scope also
    // recognizes the exact legacy NightPermi title without changing that app.
    const [selectedTotalReport, activePagesReport, countryReport, deviceReport, activityReport, ...applicationReports] = await Promise.all([
      runGA4RealtimeReport(accessToken, {
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'eventCount' },
          { name: 'keyEvents' },
        ],
      }, scopeFilter),
      runGA4RealtimeReport(accessToken, {
        dimensions: [{ name: 'unifiedScreenName' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 20,
      }, scopeFilter),
      runGA4RealtimeReport(accessToken, {
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      }, scopeFilter),
      runGA4RealtimeReport(accessToken, {
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      }, scopeFilter),
      runGA4RealtimeReport(accessToken, {
        dimensions: [{ name: 'minutesAgo' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
      }, scopeFilter),
      ...APPLICATION_SCOPES.map(application => runGA4RealtimeReport(
        accessToken,
        { metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }] },
        combineFilters(scopeFilter, buildRealtimeScopeFilter(application.key))
      )),
    ]);

    const overallTotalReport = scope.key === 'overall'
      ? selectedTotalReport
      : await runGA4RealtimeReport(accessToken, {
          metrics: [
            { name: 'activeUsers' },
            { name: 'screenPageViews' },
            { name: 'eventCount' },
            { name: 'keyEvents' },
          ],
        }, overallFilter);

    const [activeUsers, pageViews, eventCount, keyEvents] = getReportMetrics(selectedTotalReport, 4);
    const [overallActiveUsers, overallPageViews, overallEventCount, overallKeyEvents] = getReportMetrics(overallTotalReport, 4);
    const applications = applicationReports.map((report, index) => {
      const [applicationActiveUsers, applicationPageViews] = getReportMetrics(report, 2);
      return {
        ...APPLICATION_SCOPES[index],
        activeUsers: applicationActiveUsers,
        pageViews: applicationPageViews,
      };
    });
    const activePages = parseRows(activePagesReport, ['screenName'], ['activeUsers', 'pageViews']).map(row => {
      const application = getApplicationForScreenName(row.screenName);
      return {
        applicationKey: application.key,
        application: application.label,
        domain: application.domain,
        page: application.page,
        activeUsers: row.activeUsers,
        pageViews: row.pageViews,
      };
    });
    const countries = parseRows(countryReport, ['country'], ['activeUsers']);
    const devices = parseRows(deviceReport, ['device'], ['activeUsers']);
    const activity = parseRows(activityReport, ['minutesAgo'], ['activeUsers', 'pageViews'])
      .map(row => ({ ...row, minutesAgo: Number(row.minutesAgo) }))
      .sort((a, b) => b.minutesAgo - a.minutesAgo);
    const campusApplication = applications.find(application => application.key === 'campusconnect');
    const societiesApplication = applications.find(application => application.key === 'societies');
    const permissionsApplication = applications.find(application => application.key === 'permissions');
    const activeUsersByHostname = [
      { domain: CAMPUS_CONNECT_HOST, activeUsers: campusApplication?.activeUsers || 0 },
      {
        domain: STUDENT_SOCIETIES_HOST,
        activeUsers: (societiesApplication?.activeUsers || 0) + (permissionsApplication?.activeUsers || 0),
      },
    ];

    return res.json({
      configured: true,
      scope: scope.key,
      scopeLabel: scope.label,
      fetchedAt: new Date().toISOString(),
      includedDomains: INCLUDED_GA4_HOSTS,
      activeUsers,
      pageViews,
      eventCount,
      keyEvents,
      overall: {
        activeUsers: overallActiveUsers,
        pageViews: overallPageViews,
        eventCount: overallEventCount,
        keyEvents: overallKeyEvents,
      },
      applications,
      activeUsersByHostname,
      activePages,
      countries,
      devices,
      activity,
      hasData: activeUsers > 0 || pageViews > 0 || eventCount > 0 || activePages.length > 0,
    });
  } catch (err) {
    console.error('GA4 Realtime Analytics error:', err.message);
    return sendGA4Error(res, err);
  }
};

const VALID_REPORT_PERIODS = new Set(['weekly', 'monthly', 'quarterly', 'annual']);
const VALID_REPORT_TYPES = new Set(['guest_room', 'venue_booking']);

const getRequestedPeriod = (req) => {
  const period = String(req.params.period || req.query.period || '').trim().toLowerCase();
  if (!VALID_REPORT_PERIODS.has(period)) {
    const error = new Error('Invalid report period. Use weekly, monthly, quarterly, or annual.');
    error.statusCode = 400;
    throw error;
  }
  return period;
};

const getRequestedReportType = (req) => {
  const reportType = String(req.params.reportType || req.query.reportType || '').trim().toLowerCase();
  if (!VALID_REPORT_TYPES.has(reportType)) {
    const error = new Error('Invalid report type. Use guest_room or venue_booking.');
    error.statusCode = 400;
    throw error;
  }
  return reportType;
};

export const previewScheduledAnalyticsEmail = async (req, res) => {
  try {
    const period = getRequestedPeriod(req);
    const reportType = getRequestedReportType(req);
    const reportPackage = await buildScheduledAnalyticsReportPackage(period, reportType);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(reportPackage.html);
  } catch (err) {
    console.error('Analytics email preview error:', err.message);
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const downloadScheduledAnalyticsWorkbook = async (req, res) => {
  try {
    const period = getRequestedPeriod(req);
    const reportType = getRequestedReportType(req);
    const reportPackage = await buildScheduledAnalyticsReportPackage(period, reportType);
    const workbookName = reportPackage.workbookName || `${reportType}-${period}-analytics.xlsx`;

    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(workbookName);

    return res.status(200).send(reportPackage.workbookBuffer);
  } catch (err) {
    console.error('Analytics workbook download error:', err.message);
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const downloadScheduledAnalyticsPdf = async (req, res) => {
  try {
    const period = getRequestedPeriod(req);
    const reportType = getRequestedReportType(req);
    const reportPackage = await buildScheduledAnalyticsReportPackage(period, reportType);
    const pdfName = reportPackage.pdfName || `${reportType}-${period}-analytics.pdf`;

    res.type('application/pdf');
    res.attachment(pdfName);

    return res.status(200).send(reportPackage.pdfBuffer);
  } catch (err) {
    console.error('Analytics PDF download error:', err.message);
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const sendScheduledAnalyticsTestEmail = async (req, res) => {
  try {
    const period = getRequestedPeriod(req);
    const reportType = getRequestedReportType(req);
    const targetEmail = String(req.user?.email || '').trim().toLowerCase();

    if (!targetEmail) {
      return res.status(400).json({ message: 'No admin email found for test send.' });
    }

    const result = await sendScheduledAnalyticsReport(period, {
      overrideRecipients: [targetEmail],
      reportTypes: [reportType],
    });

    return res.status(200).json({
      success: true,
      message: `Test ${period} ${reportType} analytics email sent to ${targetEmail}`,
      result,
    });
  } catch (err) {
    console.error('Analytics test email send error:', err.message);
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
};
