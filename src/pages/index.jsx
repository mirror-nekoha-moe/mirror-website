import nekohaImage from '../images/nekoha.png';

import { useState, useEffect } from 'react'
import { FaDiscord, FaGithub } from 'react-icons/fa';

function Index() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api4/stats')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }
        return response.json();
      })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <title>Home</title>
      <div class="container py-4 px-3 mx-auto">
        <div className="row mb-4 d-flex justify-content-between">
          <div className="col-12 col-lg-3 offset-lg-3 align-self-center">
            <img src={nekohaImage} className="mx-auto d-block img-fluid" alt="nekoha" />
          </div>
          <div className="col-12 col-lg-6 align-self-center text-center text-lg-start">
            <h1 class="h3">Nekoha Mirror</h1>
            <h2 class="h5">Another osu! Beatmap Mirror</h2>
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
                <a class="btn btn-info w-100 d-flex align-items-center justify-content-center gap-2" href="https://discord.gg/QNCmZBqwBQ" target="_blank">
                  <FaDiscord color="#fff" />
                  <span class="text-white">Join Discord</span>
                </a>
            </div>
            <div class="col-12 col-md-auto">
              <a class="btn btn-success w-100 d-flex align-items-center justify-content-center gap-2" href="https://github.com/mirror-nekoha-moe/mirror-server/blob/master/README.MD" target="_blank">
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
                    <h5 className="card-title">Total Beatmaps</h5>
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
                    <h5 className="card-title">Total Beatmapsets</h5>
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
                    <h5 className="card-title">Latest Set ID</h5>
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
                    <h5 className="card-title">Total Size</h5>
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
                    <h5 className="card-title">Missing Beatmapsets</h5>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <p className="h3 mb-0 text-warning">
                          {stats.missing_beatmapsets}
                        </p>
                        <small className="text-muted">Missing Beatmapsets due to disabled download</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="card h-100">
                  <div className="card-body">
                    <h5 className="card-title">Beatmapsets by Status</h5>
                    <div className="row g-2 mt-2">
                      {[
                        { key: 'ranked_count', label: 'Ranked', color: 'black' },
                        { key: 'approved_count', label: 'Approved', color: 'black' },
                        { key: 'loved_count', label: 'Loved', color: 'black' },
                        { key: 'pending_count', label: 'Pending', color: 'black' },
                        { key: 'graveyard_count', label: 'Graveyard', color: 'black' }
                      ].map(status => (
                        stats[status.key] !== undefined && (
                          <div key={status.key} className="col">
                            <div className="bg-secondary d-flex justify-content-between align-items-center p-2">
                              <span className="text-black">{status.label}</span>
                              <span className={`badge bg-${status.color} rounded-pill`}>
                                {stats[status.key].toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
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
                      <h5 className="card-title">{mode.label} — Beatmaps by Status</h5>
                      <div className="row g-2 mt-2">
                        {[
                          { suffix: 'ranked_count', label: 'Ranked' },
                          { suffix: 'approved_count', label: 'Approved' },
                          { suffix: 'loved_count', label: 'Loved' },
                          { suffix: 'pending_count', label: 'Pending' },
                          { suffix: 'graveyard_count', label: 'Graveyard' }
                        ].map(s => {
                          const key = `${mode.id}_bm_${s.suffix}`;
                          const val = stats[key];
                          return (
                            val !== undefined && (
                              <div key={key} className="col-12">
                                <div className="bg-secondary d-flex justify-content-between align-items-center p-2">
                                  <span className="text-black">{s.label}</span>
                                  <span className={`badge bg-black rounded-pill`}>
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
        
      </div>
    </>
  )
}
export default Index
