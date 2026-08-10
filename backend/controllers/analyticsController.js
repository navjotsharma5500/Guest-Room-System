// controllers/analyticsController.js
// Fetches real data from Google Analytics 4 Data API
// Uses Service Account credentials stored in environment variables
// GA4 Property ID: G-Z8GK8ESCM1 → numeric property ID from GA console

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

const includedHostsFilter = {
  orGroup: {
    expressions: INCLUDED_GA4_HOSTS.map(host => ({
      filter: {
        fieldName: 'hostName',
        stringFilter: { matchType: 'EXACT', value: host, caseSensitive: false },
      },
    })),
  },
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
async function runGA4Report(accessToken, body) {
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
        // Enforce the product scope centrally so newly-added reports cannot
        // accidentally include another hostname from the shared property.
        dimensionFilter: body.dimensionFilter
          ? { andGroup: { expressions: [includedHostsFilter, body.dimensionFilter] } }
          : includedHostsFilter,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`GA4 API error: ${JSON.stringify(data.error || data)}`);
  return data;
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTROLLER — GET /api/analytics/ga4
// Returns all traffic metrics in a single call
// ═══════════════════════════════════════════════════════════════════════════════
export const getGA4Analytics = async (req, res) => {
  try {
    if (!GA4_PROPERTY_ID || !GA4_SERVICE_ACCOUNT_KEY) {
      return res.status(503).json({
        configured: false,
        message: 'GA4 not configured. Set GA4_PROPERTY_ID and GOOGLE_SERVICE_ACCOUNT_KEY in .env',
      });
    }

    const accessToken = await getGoogleAccessToken();
    const days = parseInt(req.query.days || '30', 10);
    const dateRange = { startDate: `${days}daysAgo`, endDate: 'today' };
    const prevRange = { startDate: `${days * 2}daysAgo`, endDate: `${days + 1}daysAgo` };

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
      }),

      // Previous period for trend comparison
      runGA4Report(accessToken, {
        dateRanges: [prevRange],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
        ],
      }),

      // Traffic split across the included domains.
      runGA4Report(accessToken, {
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
      runGA4Report(accessToken, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'hostName' }, { name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'averageSessionDuration' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      }),

      // Traffic sources
      runGA4Report(accessToken, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 8,
      }),

      // Device category
      runGA4Report(accessToken, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
      }),

      // Browser
      runGA4Report(accessToken, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'browser' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 6,
      }),

      // Operating system
      runGA4Report(accessToken, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'operatingSystem' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 6,
      }),

      // Countries
      runGA4Report(accessToken, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),

      // Hour of day (peak time)
      runGA4Report(accessToken, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'hour' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'hour' } }],
      }),

      // Daily trend
      runGA4Report(accessToken, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
    ]);

    // ── Parse overview ────────────────────────────────────────────────────────
    const ov     = overviewReport?.totals?.[0]?.metricValues || overviewReport?.rows?.[0]?.metricValues || [];
    const ovPrev = overviewPrevReport?.totals?.[0]?.metricValues || overviewPrevReport?.rows?.[0]?.metricValues || [];

    const overview = {
      sessions:              Number(ov[0]?.value || 0),
      totalUsers:            Number(ov[1]?.value || 0),
      newUsers:              Number(ov[2]?.value || 0),
      bounceRate:            parseFloat((Number(ov[3]?.value || 0) * 100).toFixed(1)),
      avgSessionDuration:    Math.round(Number(ov[4]?.value || 0)),
      pageViews:             Number(ov[5]?.value || 0),
      returningUsers:        Math.max(0, Number(ov[1]?.value || 0) - Number(ov[2]?.value || 0)),
      prevSessions:          Number(ovPrev[0]?.value || 0),
      prevUsers:             Number(ovPrev[1]?.value || 0),
      prevPageViews:         Number(ovPrev[2]?.value || 0),
    };

    // ── Parse other sections ──────────────────────────────────────────────────
    const domains     = parseRows(domainReport,     ['domain'],  ['sessions', 'users', 'pageViews']);
    const topPages    = parseRows(pageViewsReport,  ['domain', 'page'], ['views', 'avgDuration']);
    const sources     = parseRows(sourceReport,     ['source'],  ['sessions', 'users']);
    const devices     = parseRows(deviceReport,     ['device'],  ['sessions', 'users']);
    const browsers    = parseRows(browserReport,    ['browser'], ['sessions']);
    const oses        = parseRows(osReport,         ['os'],      ['sessions']);
    const countries   = parseRows(countryReport,    ['country'], ['sessions', 'users']);
    const hourly      = parseRows(hourReport,       ['hour'],    ['sessions'])
      .map(r => ({ hour: `${r.hour}:00`, sessions: r.sessions }));
    const daily       = parseRows(dailyReport,      ['date'],    ['sessions', 'users', 'pageViews'])
      .map(r => ({
        date: `${r.date.slice(0,4)}-${r.date.slice(4,6)}-${r.date.slice(6,8)}`,
        sessions: r.sessions,
        users: r.users,
        pageViews: r.pageViews,
      }));

    // Peak hour
    const peakHourObj = hourly.reduce((best, h) => h.sessions > (best?.sessions || 0) ? h : best, null);

    return res.json({
      configured: true,
      days,
      fetchedAt: new Date().toISOString(),
      overview,
      peakHour: peakHourObj?.hour || '—',
      includedDomains: INCLUDED_GA4_HOSTS,
      domains,
      topPages,
      sources,
      devices,
      browsers,
      oses,
      countries,
      hourly,
      daily,
    });

  } catch (err) {
    console.error('GA4 Analytics error:', err.message);
    return res.status(500).json({ configured: false, message: err.message });
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
