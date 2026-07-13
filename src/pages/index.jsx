import nekohaImage from '../images/nekoha.png';

import { useState, useEffect } from 'react'
import { FaDiscord, FaGithub } from 'react-icons/fa';
import DownloadChart from '../components/DownloadChart.jsx';
import ApiCallChart from '../components/ApiCallChart.jsx';

function Index() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadStats, setDownloadStats] = useState([]);
  const [apiCallStats, setApiCallStats] = useState(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
      })
      .then(data => { setStats(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });

    fetch('/api/download-stats?days=30')
      .then(r => r.json())
      .then(data => setDownloadStats(data))
      .catch(() => {});

    fetch('/api/api-call-stats')
      .then(r => r.json())
      .then(data => setApiCallStats(data))
      .catch(() => {});
  }, []);

  return (
    <>
      <title>osu! Beatmap Mirror | Nekoha</title>
      <div class="container py-4 px-3 mx-auto">
        <div className="row mb-4 d-flex justify-content-between">
          <div className="col-12 col-lg-3 offset-lg-2 align-self-center">
            <img src={nekohaImage} className="mx-auto d-block img-fluid" alt="nekoha" />
          </div>
          <div className="col-12 col-lg-7 align-self-center text-center text-lg-start">
            <h1 class="h3">osu! Beatmap Mirror</h1>
            <h2 class="h5">Nekoha</h2>
            <p>
                Nekoha is an osu! beatmap mirror that stores all osu! Beatmaps, though not all yet, but it's growing.
                Download Beatmaps or fetch their data with <span class="text-secondary">no ratelimit</span>.
            </p>            
          </div>
        </div>
        <div class="text-center mb-4">
          <div class="row g-2 justify-content-center">
            <div class="col-12 col-md-auto">
              <a class="btn btn-secondary w-100 d-flex align-items-center justify-content-center gap-2" href="/search">
                Browse Beatmaps
              </a>
            </div>
            <div class="col-12 col-md-auto">
                <a class="btn btn-info w-100 d-flex align-items-center justify-content-center gap-2" href="https://discord.gg/QNCmZBqwBQ" target="_blank" rel="noopener noreferrer">
                  <FaDiscord color="#fff" />
                  <span class="text-white">Join Discord</span>
                </a>
            </div>
            <div class="col-12 col-md-auto">
              <a class="btn btn-success w-100 d-flex align-items-center justify-content-center gap-2" href="https://github.com/mirror-nekoha-moe/mirror-server/blob/master/README.MD" target="_blank" rel="noopener noreferrer">
                <FaGithub />
                <span>API Documentation</span>
              </a>
            </div>
          </div>
        </div>

        <div className="row g-3 py-4">
          {loading ? (
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert bg-danger" role="alert">
              {error}
            </div>
          ) : stats && (
            <>
              <div className="col-md-6 col-lg-3">
                <div className="card h-100">
                  <div className="card-body">
                    <p className="h5 card-title">Total Beatmaps</p>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <p className="h3 mb-0 text-secondary">{stats.beatmap_count?.toLocaleString() || 0}</p>
                        <small className="text-muted">Individual difficulties</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-3">
                <div className="card h-100">
                  <div className="card-body">
                    <p className="h5 card-title">Total Beatmapsets</p>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <p className="h3 mb-0 text-secondary">{stats.beatmapset_count?.toLocaleString() || 0}</p>
                        <small className="text-muted">Beatmapsets</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-3">
                <div className="card h-100">
                  <div className="card-body">
                    <p className="h5 card-title">Latest Set ID</p>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <p className="h3 mb-0 text-secondary">{stats.last_beatmapset_id?.toLocaleString() || 0}</p>
                        <small className="text-muted">Most recent</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-3">
                <div className="card h-100">
                  <div className="card-body">
                    <p className="h5 card-title">Total Size</p>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <p className="h3 mb-0 text-secondary">
                          {stats.total_size 
                            ? `${(stats.total_size / (1024 ** 3)).toFixed(2)} GB`
                            : '0 GB'
                          }
                        </p>
                        <small className="text-muted">Downloaded data</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="card h-100">
                  <div className="card-body">
                    <p className="h5 card-title">Missing Beatmapsets by Status</p>
                    <div className="row g-2 mt-2">
                      {[
                        { key: 'missing_beatmapsets_ranked', label: 'Ranked', color: 'bg-info' },
                        { key: 'missing_beatmapsets_approved', label: 'Approved', color: 'bg-success' },
                        { key: 'missing_beatmapsets_qualified', label: 'Qualified', color: 'bg-success' },
                        { key: 'missing_beatmapsets_loved', label: 'Loved', color: 'cbg-pink-2' },
                        { key: 'missing_beatmapsets_pending', label: 'Pending', color: 'cbg-dark-grey' },
                        { key: 'missing_beatmapsets_wip', label: 'WIP', color: 'cbg-dark-grey' },
                        { key: 'missing_beatmapsets_graveyard', label: 'Graveyard', color: 'cbg-dark-grey' }
                      ].map(status => (
                        stats[status.key] !== undefined && (
                          <div key={status.key} className="col">
                            <div className={`counter-item ${status.color} d-flex justify-content-between align-items-center p-2`}>
                              <span className="card-property-title">{status.label}</span>
                              <span className={`badge cbg-black-t40 rounded-pill`}>
                                {stats[status.key].toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )
                      ))}
                      <small className="text-muted">Missing Beatmapsets due to disabled download, DMCA or ratelimit (KEKW)</small>
                      <br/>
                      <small className="text-warning mt-0">Total: {stats.missing_beatmapsets}</small>
                    </div>
                  </div>
                </div>
              </div>


              <div className="col-12">
                <div className="card h-100">
                  <div className="card-body">
                    <p className="h5 card-title">Beatmapsets by Status</p>
                    <div className="row g-2 mt-2">
                      {[
                        { key: 'ranked_count',    missingKey: 'missing_beatmapsets_ranked',     label: 'Ranked',    color: 'bg-info' },
                        { key: 'approved_count',  missingKey: 'missing_beatmapsets_approved',   label: 'Approved',  color: 'bg-success' },
                        { key: 'qualified_count', missingKey: 'missing_beatmapsets_qualified',  label: 'Qualified', color: 'bg-success' },
                        { key: 'loved_count',     missingKey: 'missing_beatmapsets_loved',      label: 'Loved',     color: 'cbg-pink-2' },
                        { key: 'pending_count',   missingKey: 'missing_beatmapsets_pending',    label: 'Pending',   color: 'cbg-dark-grey' },
                        { key: 'wip_count',       missingKey: 'missing_beatmapsets_wip',        label: 'WIP',       color: 'cbg-dark-grey' },
                        { key: 'graveyard_count', missingKey: 'missing_beatmapsets_graveyard',  label: 'Graveyard', color: 'cbg-dark-grey' }
                      ].map(status => {
                        const total = stats[status.key];
                        const missing = stats[status.missingKey] ?? 0;
                        const available = (Number(total) - Number(missing));
                        return (
                          total !== undefined && (
                            <div key={status.key} className="col">
                              <div className={`counter-item ${status.color} d-flex justify-content-between align-items-center p-2`}>
                                <span className="card-property-title">{status.label}</span>
                                <span className={`badge cbg-black-t40 rounded-pill`}>
                                  {available.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )
                        );
                      })}
                    </div>
                    <small className="text-muted mt-2 d-block">Missing beatmapsets excluded</small>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="card h-100">
                  <div className="card-body">
                    <p className="h5 card-title">Size by Status</p>
                    <div className="row g-2 mt-2">
                      {[
                        { key: 'size_ranked',    label: 'Ranked',    color: 'bg-info' },
                        { key: 'size_approved',  label: 'Approved',  color: 'bg-success' },
                        { key: 'size_qualified', label: 'Qualified', color: 'bg-success' },
                        { key: 'size_loved',     label: 'Loved',     color: 'cbg-pink-2' },
                        { key: 'size_pending',   label: 'Pending',   color: 'cbg-dark-grey' },
                        { key: 'size_wip',       label: 'WIP',       color: 'cbg-dark-grey' },
                        { key: 'size_graveyard', label: 'Graveyard', color: 'cbg-dark-grey' }
                      ].map(status => {
                        const bytes = Number(stats[status.key] ?? 0);
                        const gb = (bytes / (1024 ** 3)).toFixed(2);
                        return (
                          stats[status.key] !== undefined && (
                            <div key={status.key} className="col">
                              <div className={`counter-item ${status.color} d-flex justify-content-between align-items-center p-2`}>
                                <span className="card-property-title">{status.label}</span>
                                <span className={`badge cbg-black-t40 rounded-pill`}>
                                  {gb} GB
                                </span>
                              </div>
                            </div>
                          )
                        );
                      })}
                    </div>
                    <small className="text-muted mt-2 d-block">Downloaded files only</small>
                  </div>
                </div>
              </div>
              {[
                { id: 'osu', label: 'osu' },
                { id: 'taiko', label: 'taiko' },
                { id: 'fruits', label: 'catch' },
                { id: 'mania', label: 'mania' }
              ].map(mode => (
                <div key={mode.id} className="col-12 col-md-6 col-lg-3">
                  <div className="card h-100">
                    <div className="card-body">
                      <p className="h5 card-title">{mode.label} - Beatmaps by Status</p>
                      <div className="row g-2 mt-2">
                        {[
                          { suffix: 'ranked_count', label: 'Ranked', color: 'bg-info' },
                          { suffix: 'approved_count', label: 'Approved', color: 'bg-success' },
                          { suffix: 'qualified_count', label: 'Qualified', color: 'bg-success' },
                          { suffix: 'loved_count', label: 'Loved', color: 'cbg-pink-2' },
                          { suffix: 'pending_count', label: 'Pending', color: 'cbg-dark-grey' },
                          { suffix: 'wip_count', label: 'WIP', color: 'cbg-dark-grey' },
                          { suffix: 'graveyard_count', label: 'Graveyard', color: 'cbg-dark-grey' }
                        ].map(s => {
                          const key = `${mode.id}_bm_${s.suffix}`;
                          const val = stats[key];
                          return (
                            val !== undefined && (
                              <div key={key} className="col-12">
                                <div className={`counter-item ${s.color} d-flex justify-content-between align-items-center p-2`}>
                                  <span className="card-property-title">{s.label}</span>
                                  <span className={`badge cbg-black-t40 rounded-pill`}>
                                    {Number(val).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {downloadStats.length > 0 && (
          <div className="card mt-2 mb-4">
            <div className="card-body">
              <p className="h5 card-title">Downloads (last 30 days)</p>
              <DownloadChart data={downloadStats} />
            </div>
          </div>
        )}

        {apiCallStats && (
          <div className="card mt-2 mb-4">
            <div className="card-body">
              <p className="h5 card-title">osu! API calls (last 6h)</p>
              <ApiCallChart data={apiCallStats} />
            </div>
          </div>
        )}

      </div>
    </>
  )
}
export default Index
