import { useState, useEffect } from 'react'

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
      <div className="container py-4 px-3 mx-auto">
        <div className="text-center mb-4">
          <h1 className="h3">Another osu! Beatmap Mirror</h1>
          <h2 className="h5">Ranked, Approved, Loved for now only</h2>
        </div>

        <div className="row g-3 py-4">
          {loading ? (
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger" role="alert">
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
                    <h5 className="card-title">Sets by Status</h5>
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
            </>
          )}
        </div>
        
      </div>
    </>
  )
}
export default Index
