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

        <div className="row g-4 py-4">
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
              <div className="col-md-6 col-lg-4">
                <div className="card h-100">
                  <div className="card-body">
                    <h5 className="card-title">Total Beatmaps</h5>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <p className="h3 mb-0">{stats.beatmap_count.toLocaleString()}</p>
                        <small className="text-muted">Individual difficulties</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-4">
                <div className="card h-100">
                  <div className="card-body">
                    <h5 className="card-title">Total Beatmapsets</h5>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <p className="h3 mb-0">{stats.beatmapset_count.toLocaleString()}</p>
                        <small className="text-muted">Beatmapsets</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-4">
                <div className="card h-100">
                  <div className="card-body">
                    <h5 className="card-title">By Status</h5>
                    <div className="list-group list-group-flush bg-dark">
                      {[
                        { key: 'ranked_count', label: 'Ranked', color: 'success' },
                        { key: 'approved_count', label: 'Approved', color: 'success' },
                        { key: 'loved_count', label: 'Loved', color: 'success' },
                        { key: 'pending_count', label: 'Pending', color: 'success' },
                        { key: 'graveyard_count', label: 'Graveyard', color: 'success' }
                      ].map(status => (
                        stats[status.key] !== undefined && (
                          <div key={status.key} className="list-group-item d-flex justify-content-between align-items-center bg-dark text-white border-secondary">
                            {status.label}
                            <span className={`badge bg-${status.color} rounded-pill`}>
                              {stats[status.key].toLocaleString()}
                            </span>
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
