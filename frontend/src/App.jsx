
import { useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ChartTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import './App.css';

const COLORS = { Positive: '#63866b', Neutral: '#d4d9cf', Negative: '#c8755f' };

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

const NAV = [
  { id: 'overview', label: 'Overview', icon: '▦' },
  { id: 'insights', label: 'AI Insights', icon: '✳' },
  { id: 'reviews', label: 'All Reviews', icon: '▤' },
  { id: 'reports', label: 'Reports', icon: '▥' },
];

const POSITIVE = ['good', 'great', 'excellent', 'love', 'loved', 'amazing', 'perfect', 'easy', 'fast', 'helpful', 'friendly', 'wonderful', 'best', 'happy', 'satisfied', 'smooth', 'quality', 'recommend', 'reliable', 'quick', 'comfortable', 'beautiful', 'impressive'];

const NEGATIVE = ['bad', 'poor', 'terrible', 'awful', 'hate', 'hated', 'worst', 'slow', 'late', 'delay', 'delayed', 'broken', 'damaged', 'defective', 'difficult', 'problem', 'issue', 'disappointed', 'disappointing', 'unhelpful', 'rude', 'expensive', 'waste', 'return', 'refund', 'missing', 'unreliable', 'fail', 'failed', 'frustrating', 'unhappy', 'not working'];

const NEGATORS = new Set(['not', 'no', 'never', 'hardly', 'barely', 'isnt', "isn't", 'wasnt', "wasn't", 'dont', "don't", 'didnt', "didn't", 'cannot', "can't", 'couldnt', "couldn't", 'without', 'neither']);

const THEMES = [
  { name: 'Delivery & Shipping', words: ['delivery', 'shipping', 'arrived', 'courier', 'package', 'parcel', 'late', 'tracking', 'dispatch'] },
  { name: 'Product Quality', words: ['quality', 'broken', 'damaged', 'defective', 'material', 'durable', 'product', 'faulty'] },
  { name: 'Price & Value', words: ['price', 'expensive', 'cost', 'value', 'cheap', 'discount', 'charged', 'money'] },
  { name: 'Customer Support', words: ['support', 'service', 'staff', 'agent', 'helpful', 'response', 'rude', 'contact', 'call'] },
  { name: 'Usability & Features', words: ['easy', 'difficult', 'feature', 'design', 'setup', 'install', 'interface', 'use', 'app'] },
  { name: 'Returns & Refunds', words: ['return', 'refund', 'exchange', 'replacement', 'cancel', 'cancellation'] },
];

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];

    if (ch === '"' && quoted && source[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && source[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  row.push(cell.trim());
  if (row.some(v => v !== '')) rows.push(row);

  if (rows.length < 2) {
    throw new Error('The CSV needs a header row and at least one review.');
  }

  const headers = rows.shift().map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const find = names => headers.findIndex(h => names.includes(h));

  const reviewIndex = find(['review', 'reviewtext', 'text', 'comment', 'comments', 'feedback', 'content', 'body', 'description']);
  const ratingIndex = find(['rating', 'stars', 'score', 'starrating', 'reviewrating']);
  const dateIndex = find(['date', 'reviewdate', 'createdat', 'timestamp']);
  const nameIndex = find(['name', 'customer', 'customername', 'author', 'username', 'reviewer']);

  if (reviewIndex < 0) {
    throw new Error('Could not find a review text column. Use a header such as review, text, comment, or feedback.');
  }

  return rows.map((r, i) => ({
    id: `${Date.now()}-${i}`,
    text: r[reviewIndex] || '',
    rating: ratingIndex >= 0 ? parseRating(r[ratingIndex]) : null,
    date: dateIndex >= 0 ? r[dateIndex] : '',
    customer: nameIndex >= 0 ? r[nameIndex] : `Customer ${i + 1}`,
  })).filter(r => r.text.trim());
}

function parseRating(value) {
  const n = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
}

function classifySentiment(review) {
  if (review.rating !== null && review.rating !== undefined) {
    if (review.rating >= 4) return 'Positive';
    if (review.rating <= 2) return 'Negative';
    return 'Neutral';
  }

  const tokens = review.text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
  let score = 0;

  tokens.forEach((word, i) => {
    let value = POSITIVE.includes(word) ? 1 : NEGATIVE.includes(word) ? -1 : 0;
    if (!value) return;

    const context = tokens.slice(Math.max(0, i - 3), i);
    if (context.some(t => NEGATORS.has(t))) value *= -1;

    if (i > 0 && ['very', 'really', 'extremely', 'absolutely', 'super'].includes(tokens[i - 1])) {
      value *= 1.5;
    }

    score += value;
  });

  if (score >= 1) return 'Positive';
  if (score <= -1) return 'Negative';
  return 'Neutral';
}

function classifyTheme(text) {
  const lower = text.toLowerCase();
  let best = null;
  let count = 0;

  THEMES.forEach(theme => {
    const hits = theme.words.reduce(
      (n, word) => n + (new RegExp(`\\b${word}\\b`, 'i').test(lower) ? 1 : 0),
      0
    );

    if (hits > count) {
      count = hits;
      best = theme.name;
    }
  });

  return best || 'General Feedback';
}

function enrichReviews(reviews) {
  return reviews.map(r => ({
    ...r,
    sentiment: classifySentiment(r),
    theme: classifyTheme(r.text),
  }));
}

function percent(n, total) {
  return total ? Math.round((n / total) * 100) : 0;
}

function downloadFile(name, content, type = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCSV(reviews, name = 'voice-of-customer-reviews.csv') {
  const headers = ['Customer', 'Date', 'Rating', 'Sentiment', 'Theme', 'Review'];
  const body = reviews.map(r =>
    [r.customer, r.date, r.rating ?? '', r.sentiment, r.theme, r.text]
      .map(csvEscape)
      .join(',')
  );
  downloadFile(name, [headers.join(','), ...body].join('\r\n'));
}

function Icon({ children }) {
  return <span className="ui-icon" aria-hidden="true">{children}</span>;
}

function SentimentBadge({ sentiment }) {
  return (
    <span className={`sentiment-badge ${sentiment.toLowerCase()}`}>
      <span className="sentiment-dot" />
      {sentiment}
    </span>
  );
}

function EmptyState({ onUpload }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">✳</div>
      <h2>Turn customer feedback into clear next steps.</h2>
      <p>
        Upload a CSV of customer reviews to explore sentiment, recurring themes,
        priority issues, and actionable insights. CSV parsing happens in your browser;
        AI insights are requested only when you choose to generate them.
      </p>
      <button className="primary-button" onClick={onUpload}>↑ Upload review data</button>
      <span className="empty-hint">CSV files up to 5 MB · Your raw file stays in this browser</span>
    </div>
  );
}

export default function App() {
  const [reviews, setReviews] = useState([]);
  const [fileName, setFileName] = useState('');
  const [activePage, setActivePage] = useState('overview');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('All sentiments');
  const [themeFilter, setThemeFilter] = useState('All themes');
  const [sortBy, setSortBy] = useState('priority');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const fileInput = useRef(null);

  const stats = useMemo(() => {
    const total = reviews.length;
    const positive = reviews.filter(r => r.sentiment === 'Positive').length;
    const neutral = reviews.filter(r => r.sentiment === 'Neutral').length;
    const negative = reviews.filter(r => r.sentiment === 'Negative').length;
    const rated = reviews.filter(r => r.rating != null);
    const average = rated.length
      ? rated.reduce((sum, r) => sum + r.rating, 0) / rated.length
      : null;

    const themes = {};
    reviews.forEach(r => {
      if (!themes[r.theme]) {
        themes[r.theme] = {
          name: r.theme, total: 0, positive: 0, neutral: 0, negative: 0, examples: [],
        };
      }
      const t = themes[r.theme];
      t.total++;
      t[r.sentiment.toLowerCase()]++;
      if (t.examples.length < 3) t.examples.push(r);
    });

    const themeList = Object.values(themes).sort((a, b) => b.total - a.total);
    const priority = [...reviews]
      .filter(r => r.sentiment === 'Negative')
      .sort((a, b) => (a.rating ?? 2) - (b.rating ?? 2));

    const sentimentData = [
      { name: 'Positive', value: positive },
      { name: 'Neutral', value: neutral },
      { name: 'Negative', value: negative },
    ].filter(d => d.value > 0);

    return {
      total, positive, neutral, negative, average,
      ratedCount: rated.length,
      positivePct: percent(positive, total),
      negativePct: percent(negative, total),
      themes: themeList, priority, sentimentData,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    let list = reviews.filter(r =>
      (r.text.toLowerCase().includes(search.toLowerCase()) ||
        r.customer.toLowerCase().includes(search.toLowerCase())) &&
      (sentimentFilter === 'All sentiments' || r.sentiment === sentimentFilter) &&
      (themeFilter === 'All themes' || r.theme === themeFilter)
    );

    if (sortBy === 'priority') {
      list = [...list].sort((a, b) =>
        (a.sentiment === 'Negative' ? 0 : 1) -
        (b.sentiment === 'Negative' ? 0 : 1) ||
        (a.rating ?? 3) - (b.rating ?? 3)
      );
    }

    if (sortBy === 'newest') list = [...list].reverse();
    if (sortBy === 'rating-high') list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sortBy === 'rating-low') list = [...list].sort((a, b) => (a.rating ?? 6) - (b.rating ?? 6));

    return list;
  }, [reviews, search, sentimentFilter, themeFilter, sortBy]);

  const uploadFile = async (file) => {
    if (!file) return;
    setError('');
    setAiResult(null);
    setAiError('');

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please choose a .csv file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('This file is larger than 5 MB. Please upload a smaller CSV.');
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setReviews(enrichReviews(parsed));
      setFileName(file.name);
      setActivePage('overview');
      setSearch('');
      setSentimentFilter('All sentiments');
      setThemeFilter('All themes');
    } catch (e) {
      setError(e.message || 'Could not read this CSV. Check the column headers and try again.');
    }
  };

  const uploadClick = () => fileInput.current?.click();

  const runAI = async () => {
    setAiLoading(true);
    setAiError('');
    setAiResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviews: reviews.map(r => ({
            text: r.text, rating: r.rating, sentiment: r.sentiment, theme: r.theme,
          })).slice(0, 50),
          summary: {
            total: stats.total,
            positive: stats.positive,
            neutral: stats.neutral,
            negative: stats.negative,
            themes: stats.themes.map(t => ({
              name: t.name, total: t.total, negative: t.negative,
            })),
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'AI analysis failed. Check the configured backend URL and AI service.');
      }
      setAiResult(data);
    } catch (e) {
      setAiError(`${e.message || 'Could not connect to the AI service.'} You can still use the dashboard’s built-in sentiment and theme analysis.`);
    } finally {
      setAiLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSentimentFilter('All sentiments');
    setThemeFilter('All themes');
    setSortBy('priority');
  };

  const pageTitle = NAV.find(n => n.id === activePage)?.label || 'Overview';

  const sentimentTooltip = ({ active, payload }) =>
    active && payload?.length
      ? <div className="chart-tooltip"><strong>{payload[0].name}</strong><span>{payload[0].value} reviews</span></div>
      : null;

  return (
    <div className="app-shell">
      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={e => {
          uploadFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><span /><span /><span /></div>
          <div className="brand-copy">
            <strong>VoiceOfCustomer</strong>
            <span>FEEDBACK INTELLIGENCE</span>
          </div>
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>

        <nav className="main-nav" aria-label="Main navigation">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <Icon>{item.icon}</Icon>
              <span>{item.label}</span>
              {item.id === 'reviews' && reviews.length > 0 && (
                <span className="nav-count">{reviews.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="privacy-card">
            <span className="privacy-indicator" />
            <div>
              <strong>Privacy-conscious analysis</strong>
              <p>CSV parsing runs in your browser. Review text is sent to the configured AI service only when you request AI insights.</p>
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="footer-logo">VOC</div>
            <div>
              <strong>VoiceOfCustomer</strong>
              <span>Local feedback workspace</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{pageTitle}</strong>
          </div>

          <div className="topbar-actions">
            {fileName && (
              <span className="loaded-file" title={fileName}>▤ {fileName}</span>
            )}
            <button className="primary-button top-upload" onClick={uploadClick}>
              ↑ <span>{reviews.length ? 'Upload new CSV' : 'Upload CSV'}</span>
            </button>
          </div>
        </header>

        <div className="page-content">
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button aria-label="Dismiss error" onClick={() => setError('')}>×</button>
            </div>
          )}

          {!reviews.length ? (
            <EmptyState onUpload={uploadClick} />
          ) : (
            <>
              {activePage === 'overview' && (
                <>
                  <div className="page-intro">
                    <div>
                      <span className="eyebrow">CUSTOMER FEEDBACK OVERVIEW</span>
                      <h1>
                        Understand what customers
                        <br className="desktop-break" /> are really saying.
                      </h1>
                      <p>
                        Explore {stats.total.toLocaleString()} reviews, spot recurring
                        themes, and prioritize what needs attention.
                      </p>
                    </div>
                    <button className="secondary-button" onClick={() => exportCSV(reviews)}>
                      ↓ Export reviews
                    </button>
                  </div>

                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-top">
                        <span>Total reviews</span>
                        <span className="stat-icon neutral-icon">▤</span>
                      </div>
                      <strong>{stats.total.toLocaleString()}</strong>
                      <p>{stats.ratedCount ? `${stats.ratedCount} with ratings` : 'Feedback records analyzed'}</p>
                    </div>

                    <div className="stat-card">
                      <div className="stat-top">
                        <span>Positive sentiment</span>
                        <span className="stat-icon positive-icon">↗</span>
                      </div>
                      <strong>{stats.positivePct}<span className="stat-out-of">%</span></strong>
                      <p>{stats.positive} positive reviews</p>
                    </div>

                    <div className="stat-card">
                      <div className="stat-top">
                        <span>Negative sentiment</span>
                        <span className="stat-icon negative-icon">↘</span>
                      </div>
                      <strong>{stats.negativePct}<span className="stat-out-of">%</span></strong>
                      <p>{stats.negative} need attention</p>
                    </div>

                    <div className="stat-card">
                      <div className="stat-top">
                        <span>Average rating</span>
                        <span className="stat-icon rating-icon">★</span>
                      </div>
                      <strong>
                        {stats.average == null ? '—' : stats.average.toFixed(1)}
                        <span className="stat-out-of">
                          {stats.average == null ? '' : ' / 5'}
                        </span>
                      </strong>
                      <p>
                        {stats.average == null
                          ? 'No rating column detected'
                          : `Across ${stats.ratedCount} rated reviews`}
                      </p>
                    </div>
                  </div>

                  <div className="content-grid">
                    <section className="panel chart-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Sentiment distribution</h2>
                          <p>How customers feel about their experience</p>
                        </div>
                      </div>

                      <div className="sentiment-chart-layout">
                        <div className="donut-chart-wrap">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={stats.sentimentData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius="62%"
                                outerRadius="83%"
                                paddingAngle={3}
                                stroke="none"
                              >
                                {stats.sentimentData.map(entry => (
                                  <Cell key={entry.name} fill={COLORS[entry.name]} />
                                ))}
                              </Pie>
                              <ChartTooltip content={sentimentTooltip} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="donut-center">
                            <strong>{stats.total}</strong>
                            <span>Total reviews</span>
                          </div>
                        </div>

                        <div className="chart-legend">
                          {['Positive', 'Neutral', 'Negative'].map(s => (
                            <div className="chart-legend-row" key={s}>
                              <span
                                className="chart-legend-dot"
                                style={{ background: COLORS[s] }}
                              />
                              <span>{s}</span>
                              <strong>{stats[s.toLowerCase()]}</strong>
                              <small>
                                {percent(stats[s.toLowerCase()], stats.total)}% of reviews
                              </small>
                            </div>
                          ))}
                        </div>
                      </div>

                      <p className="method-note">
                        Ratings take priority when present. Text-only reviews use
                        keyword scoring with negation handling.
                      </p>
                    </section>

                    <section className="panel chart-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Most discussed themes</h2>
                          <p>Topics mentioned most often in feedback</p>
                        </div>
                        <button className="text-action" onClick={() => setActivePage('insights')}>
                          View insights →
                        </button>
                      </div>

                      {stats.themes.length ? (
                        <div className="pain-chart">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={stats.themes.slice(0, 5).map(t => ({
                                name: t.name.replace(' & ', ' / '),
                                Reviews: t.total,
                                Negative: t.negative,
                              }))}
                              layout="vertical"
                              margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={false}
                                stroke="#edf0e9"
                              />
                              <XAxis
                                type="number"
                                allowDecimals={false}
                                tick={{ fontSize: 9, fill: '#92998f' }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                type="category"
                                dataKey="name"
                                width={112}
                                tick={{ fontSize: 9, fill: '#737d71' }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <ChartTooltip />
                              <Bar
                                dataKey="Reviews"
                                fill="#9eb59a"
                                radius={[0, 4, 4, 0]}
                                barSize={13}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="muted-copy">Themes will appear when reviews are available.</p>
                      )}

                      <p className="method-note">
                        Themes are assigned from recurring keywords in each review.
                      </p>
                    </section>
                  </div>

                  <div className="content-grid lower-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Recent customer reviews</h2>
                          <p>A quick look at the latest feedback</p>
                        </div>
                        <button className="text-action" onClick={() => setActivePage('reviews')}>
                          See all →
                        </button>
                      </div>

                      <div className="review-list">
                        {[...reviews].slice(-4).reverse().map(r => (
                          <div className="review-row" key={r.id}>
                            <div className="review-main">
                              <div className="review-meta">
                                <strong>{r.customer}</strong>
                                <span>{r.date || 'Date not provided'}</span>
                              </div>
                              <p>{r.text}</p>
                              <span className="theme-label">{r.theme}</span>
                            </div>
                            <SentimentBadge sentiment={r.sentiment} />
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Priority issues</h2>
                          <p>Negative reviews to investigate first</p>
                        </div>
                        <span className="theme-negative-count">{stats.negative} flagged</span>
                      </div>

                      <div className="priority-list">
                        {stats.priority.slice(0, 4).map(r => (
                          <div className="priority-row" key={r.id}>
                            <span className="priority-indicator" />
                            <div>
                              <p>{r.text}</p>
                              <span>
                                {r.theme}{r.rating != null ? ` · ${r.rating}/5 rating` : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                        {!stats.priority.length && (
                          <p className="muted-copy">
                            No negative reviews detected. Keep monitoring new feedback.
                          </p>
                        )}
                      </div>
                    </section>
                  </div>
                </>
              )}

              {activePage === 'insights' && (
                <>
                  <div className="page-intro">
                    <div>
                      <span className="eyebrow">PATTERNS & OPPORTUNITIES</span>
                      <h1>Insights that move you forward.</h1>
                      <p>
                        Explore recurring customer themes and use AI-powered analysis
                        to turn feedback into action.
                      </p>
                    </div>
                    <button className="primary-button" onClick={runAI} disabled={aiLoading}>
                      {aiLoading ? '◌ Analyzing…' : '✳ Generate AI insights'}
                    </button>
                  </div>

                  <section className="panel insights-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>AI-powered analysis</h2>
                        <p>
                          Review text is sent to the configured AI provider only when
                          you request insights. Avoid uploading sensitive personal data.
                        </p>
                      </div>
                      <span className="theme-label">Configured AI service</span>
                    </div>

                    {aiError && (
                      <div className="error-banner" role="alert">
                        <span>{aiError}</span>
                        <button onClick={() => setAiError('')} aria-label="Dismiss">×</button>
                      </div>
                    )}

                    {aiLoading && (
                      <div className="ai-loading">
                        <span className="loading-orb">✳</span>
                        <strong>Finding patterns in customer feedback…</strong>
                        <p>Analyzing up to 50 reviews with the configured AI service.</p>
                      </div>
                    )}

                    {aiResult && <AIResults result={aiResult} />}

                    {!aiResult && !aiLoading && (
                      <div className="ai-empty">
                        <div className="empty-icon">✳</div>
                        <h3>Go beyond the numbers</h3>
                        <p>
                          Generate a concise summary, recurring pain points, and
                          practical recommendations from your uploaded reviews.
                        </p>
                        <button className="primary-button" onClick={runAI}>
                          Generate AI insights
                        </button>
                      </div>
                    )}
                  </section>

                  <section className="panel insights-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Theme breakdown</h2>
                        <p>Sentiment mix and examples for the most common topics</p>
                      </div>
                    </div>

                    <div className="theme-insights-list">
                      {stats.themes.map(t => (
                        <div className="theme-insight" key={t.name}>
                          <div className="theme-insight-header">
                            <div>
                              <h3>{t.name}</h3>
                              <span>
                                {t.total} reviews · {percent(t.total, stats.total)}% of feedback
                              </span>
                            </div>
                          </div>

                          <div className="stacked-bar">
                            <span
                              className="stacked-positive"
                              style={{ width: `${percent(t.positive, t.total)}%` }}
                            />
                            <span
                              className="stacked-neutral"
                              style={{ width: `${percent(t.neutral, t.total)}%` }}
                            />
                            <span
                              className="stacked-negative"
                              style={{ width: `${percent(t.negative, t.total)}%` }}
                            />
                          </div>

                          <div className="theme-counts">
                            <span><i className="legend-positive" />{t.positive} positive</span>
                            <span><i className="legend-neutral" />{t.neutral} neutral</span>
                            <span><i className="legend-negative" />{t.negative} negative</span>
                          </div>

                          <div className="theme-examples">
                            <span className="example-label">REVIEW EXAMPLES</span>
                            {t.examples.slice(0, 2).map(r => (
                              <div className="theme-example-row" key={r.id}>
                                <p>“{r.text}”</p>
                                <SentimentBadge sentiment={r.sentiment} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {!stats.themes.length && (
                        <p className="muted-copy">No themes available.</p>
                      )}
                    </div>

                    <div className="method-banner">
                      <div className="method-banner-icon">i</div>
                      <div>
                        <strong>How these insights are created</strong>
                        <p>
                          Sentiment uses supplied ratings when available. Without
                          ratings, the dashboard scores sentiment keywords and accounts
                          for common negation such as “not good”. Themes are inferred
                          from review wording; treat them as helpful signals rather than
                          perfect classifications.
                        </p>
                      </div>
                    </div>
                  </section>
                </>
              )}

              {activePage === 'reviews' && (
                <>
                  <div className="page-intro">
                    <div>
                      <span className="eyebrow">FEEDBACK EXPLORER</span>
                      <h1>Every review, in context.</h1>
                      <p>Search, filter, and export your customer feedback.</p>
                    </div>
                    <button
                      className="secondary-button"
                      onClick={() => exportCSV(filteredReviews, 'voice-of-customer-filtered-reviews.csv')}
                    >
                      ↓ Export filtered
                    </button>
                  </div>

                  <section className="panel reviews-panel">
                    <div className="review-toolbar">
                      <label className="search-box">
                        <span>⌕</span>
                        <input
                          aria-label="Search reviews"
                          placeholder="Search review text or customer…"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                        />
                      </label>

                      <select
                        aria-label="Filter sentiment"
                        value={sentimentFilter}
                        onChange={e => setSentimentFilter(e.target.value)}
                      >
                        <option>All sentiments</option>
                        <option>Positive</option>
                        <option>Neutral</option>
                        <option>Negative</option>
                      </select>

                      <select
                        aria-label="Filter theme"
                        value={themeFilter}
                        onChange={e => setThemeFilter(e.target.value)}
                      >
                        <option>All themes</option>
                        {stats.themes.map(t => <option key={t.name}>{t.name}</option>)}
                      </select>

                      <select
                        aria-label="Sort reviews"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                      >
                        <option value="priority">Priority first</option>
                        <option value="newest">Latest in file</option>
                        <option value="rating-high">Highest rating</option>
                        <option value="rating-low">Lowest rating</option>
                      </select>

                      <button className="clear-filters" onClick={clearFilters}>
                        Clear filters
                      </button>
                    </div>

                    <div className="table-summary">
                      Showing <strong>{filteredReviews.length}</strong> of{' '}
                      <strong>{reviews.length}</strong> reviews
                    </div>

                    {filteredReviews.length ? (
                      <div className="reviews-table-wrap">
                        <table className="reviews-table">
                          <thead>
                            <tr>
                              <th>Customer review</th>
                              <th>Rating</th>
                              <th>Sentiment</th>
                              <th>Theme</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredReviews.map(r => (
                              <tr key={r.id}>
                                <td>
                                  <div className="table-review-text">
                                    <strong>{r.customer}</strong>
                                    <p>{r.text}</p>
                                  </div>
                                </td>
                                <td>
                                  {r.rating == null ? '—' : (
                                    <span className="rating-stars">
                                      {'★'.repeat(Math.round(r.rating))}
                                      <span className="rating-empty">
                                        {'★'.repeat(5 - Math.round(r.rating))}
                                      </span>
                                      {' '}<small>{r.rating}</small>
                                    </span>
                                  )}
                                </td>
                                <td><SentimentBadge sentiment={r.sentiment} /></td>
                                <td><span className="theme-label">{r.theme}</span></td>
                                <td className="date-cell">{r.date || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="table-empty">
                        <strong>No matching reviews</strong>
                        <p>Try another search or clear your filters.</p>
                        <button className="secondary-button" onClick={clearFilters}>
                          Clear filters
                        </button>
                      </div>
                    )}
                  </section>
                </>
              )}

              {activePage === 'reports' && (
                <>
                  <div className="page-intro">
                    <div>
                      <span className="eyebrow">EXPORT & SHARE</span>
                      <h1>Reports for your next decision.</h1>
                      <p>
                        Download structured review data or a summary of the current
                        feedback set.
                      </p>
                    </div>
                  </div>

                  <div className="report-grid">
                    <section className="panel report-card">
                      <div className="report-icon">▤</div>
                      <h2>Complete review data</h2>
                      <p>
                        Export every review with its rating, inferred sentiment, theme,
                        customer name, and date.
                      </p>
                      <div className="report-details">
                        <span>{stats.total} reviews</span>
                        <span>6 columns</span>
                        <span>CSV format</span>
                      </div>
                      <button className="primary-button" onClick={() => exportCSV(reviews)}>
                        ↓ Download CSV
                      </button>
                    </section>

                    <section className="panel report-card">
                      <div className="report-icon negative-report-icon">↘</div>
                      <h2>Priority issues</h2>
                      <p>
                        Export negative reviews so your team can focus on the most
                        urgent customer pain points.
                      </p>
                      <div className="report-details">
                        <span>{stats.negative} negative reviews</span>
                        <span>Sorted by priority</span>
                      </div>
                      <button
                        className="secondary-button"
                        onClick={() => exportCSV(stats.priority, 'voice-of-customer-priority-issues.csv')}
                      >
                        ↓ Download priority CSV
                      </button>
                    </section>

                    <section className="panel report-card">
                      <div className="report-icon">✳</div>
                      <h2>AI insights</h2>
                      <p>
                        Generate an AI-powered summary and recommendations using the
                        configured server-side AI service.
                      </p>
                      <div className="report-details">
                        <span>Server-side AI</span>
                        <span>Configured provider</span>
                      </div>
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setActivePage('insights');
                          if (!aiResult) runAI();
                        }}
                      >
                        ✳ Generate AI insights
                      </button>
                    </section>

                    <section className="panel report-card">
                      <div className="report-icon">▥</div>
                      <h2>Feedback snapshot</h2>
                      <p>
                        Download a compact JSON summary of sentiment and theme counts
                        for documentation or further analysis.
                      </p>
                      <div className="report-details">
                        <span>Summary only</span>
                        <span>JSON format</span>
                      </div>
                      <button
                        className="secondary-button"
                        onClick={() => downloadFile(
                          'voice-of-customer-summary.json',
                          JSON.stringify({
                            generatedAt: new Date().toISOString(),
                            total: stats.total,
                            sentiment: {
                              positive: stats.positive,
                              neutral: stats.neutral,
                              negative: stats.negative,
                            },
                            averageRating: stats.average,
                            themes: stats.themes.map(({
                              name, total, positive, neutral, negative,
                            }) => ({
                              name, total, positive, neutral, negative,
                            })),
                          }, null, 2),
                          'application/json'
                        )}
                      >
                        ↓ Download JSON
                      </button>
                    </section>
                  </div>

                  <section className="panel report-summary">
                    <div className="panel-heading">
                      <div>
                        <h2>Current dataset summary</h2>
                        <p>A quick overview of the loaded review file</p>
                      </div>
                    </div>
                    <div className="report-summary-grid">
                      <div><span>Total reviews</span><strong>{stats.total}</strong></div>
                      <div><span>Positive</span><strong>{stats.positive}</strong></div>
                      <div><span>Neutral</span><strong>{stats.neutral}</strong></div>
                      <div><span>Negative</span><strong>{stats.negative}</strong></div>
                      <div>
                        <span>Average rating</span>
                        <strong>{stats.average == null ? '—' : stats.average.toFixed(1)}</strong>
                      </div>
                    </div>
                  </section>
                </>
              )}

              <footer className="page-footer">
                <span>VoiceOfCustomer</span>
                <span>Built for clearer customer understanding · Browser-based CSV analysis</span>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function AIResults({ result }) {
  const data = result.insights || result;

  const summary =
    data.summary || data.overview || data.analysis || '';

  const painPoints =
    data.topIssues ||
    data.painPoints ||
    data.pain_points ||
    data.recurringPainPoints ||
    [];

  const recommendations =
    data.recommendedActions ||
    data.recommendations ||
    data.actions ||
    [];

  const findings = Array.isArray(data.keyFindings)
    ? data.keyFindings
    : [];

  const highlights = Array.isArray(data.positiveHighlights)
    ? data.positiveHighlights
    : [];

  const items = value =>
    Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(/\n+/)
            .map(s => s.replace(/^[-*\d.)\s]+/, '').trim())
            .filter(Boolean)
        : [];

  const painList = items(painPoints);
  const recList = items(recommendations);

  return (
    <div className="ai-results">
      <div className="ai-summary-block">
        <span className="eyebrow">EXECUTIVE SUMMARY</span>
        <p>
          {typeof summary === 'string'
            ? summary || 'No summary was returned.'
            : JSON.stringify(summary)}
        </p>
        {data.overallSentiment && (
          <span className="theme-label">
            Overall sentiment: {data.overallSentiment}
          </span>
        )}
      </div>

      {findings.length > 0 && (
        <section className="ai-result-card">
          <h3>Key findings</h3>
          <ul>
            {findings.map((item, i) => (
              <li key={i}>
                <strong>{item.title || `Finding ${i + 1}`}</strong>
                {item.evidence && <p>{item.evidence}</p>}
                {item.impact && (
                  <span className="theme-label">
                    Impact: {item.impact}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="ai-result-grid">
        <section className="ai-result-card">
          <div className="ai-result-heading">
            <span className="ai-result-icon negative-report-icon">↘</span>
            <div>
              <h3>Recurring pain points</h3>
              <p>Patterns that may be hurting customer experience</p>
            </div>
          </div>

          {painList.length > 0 ? (
            <ul>
              {painList.map((item, i) => (
                <li key={i}>
                  {typeof item === 'string' ? (
                    item
                  ) : (
                    <>
                      <strong>
                        {item.theme || item.title || item.problem ||
                          item.issue || `Issue ${i + 1}`}
                      </strong>
                      {item.problem && item.theme && (
                        <p>{item.problem}</p>
                      )}
                      {item.description && <p>{item.description}</p>}
                      {item.evidence && (
                        <p className="ai-evidence">{item.evidence}</p>
                      )}
                      {item.impact && (
                        <span className="theme-label">
                          Impact: {item.impact}
                        </span>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No recurring pain points were identified in the returned analysis.</p>
          )}
        </section>

        <section className="ai-result-card">
          <div className="ai-result-heading">
            <span className="ai-result-icon positive-icon">↗</span>
            <div>
              <h3>Recommended actions</h3>
              <p>Practical steps to consider next</p>
            </div>
          </div>

          {recList.length > 0 ? (
            <ol>
              {recList.map((item, i) => (
                <li key={i}>
                  {typeof item === 'string' ? (
                    item
                  ) : (
                    <>
                      <strong>
                        {item.action || item.title || `Action ${i + 1}`}
                      </strong>
                      {item.reason && <p>{item.reason}</p>}
                      {item.description && <p>{item.description}</p>}
                      {item.priority && (
                        <span className="theme-label">
                          Priority: {item.priority}
                        </span>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p>No recommendations were returned by the model.</p>
          )}
        </section>
      </div>

      {highlights.length > 0 && (
        <section className="ai-result-card">
          <h3>Positive highlights</h3>
          <ul>
            {highlights.map((item, i) => (
              <li key={i}>
                {typeof item === 'string' ? item : JSON.stringify(item)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.limitations && (
        <p className="method-note">
          Limitations: {data.limitations}
        </p>
      )}

      <p className="method-note">
        AI-generated insights can be imperfect. Validate recommendations
        against the original customer reviews.
      </p>
    </div>
  );
}
