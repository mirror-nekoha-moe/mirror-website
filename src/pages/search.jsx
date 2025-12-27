import React, { useState, useEffect, useRef } from 'react';
import { FaDownload, FaRegDotCircle, FaDrum } from 'react-icons/fa';
import { MdPiano } from 'react-icons/md';
import { FaAppleWhole, FaCircleCheck } from 'react-icons/fa6';
import axios from 'axios';

export default function BeatmapsetSearch() {
  // Map status code to string
  const statusMap = {
    1: 'Ranked',
    2: 'Approved',
    3: 'Qualified',
    4: 'Loved',
    0: 'Pending',
    '-1': 'WIP',
    '-2': 'Graveyard',
  };
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const topRef = useRef(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setPage(1);
    fetchResults(1, query);
  };

  const fetchResults = async (pageNum, q) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api4/search`, {
        params: { q, page: pageNum }
      });
      setResults(res.data);
    } catch (err) {
      setError('Failed to fetch results');
    }
    setLoading(false);
  };

  // Fetch results on page change (except initial mount)
  useEffect(() => {
    if (page > 1) fetchResults(page, query);
    // eslint-disable-next-line
  }, [page]);

  // Initial search on mount
  useEffect(() => {
    fetchResults(1, '');
    // eslint-disable-next-line
  }, []);
  
  // Scroll to top on page change
  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [page]);
  
  const Pagination = () => (
    <div className="d-flex justify-content-between align-items-center mb-3">
      <button
        className="btn btn-outline-secondary"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >Previous</button>
      <span>Page {page}</span>
      <button
        className="btn btn-outline-secondary"
        disabled={results.length < 100}
        onClick={() => setPage(page + 1)}
      >Next</button>
    </div>
  );

  return (
    <>
      <title>Search</title>
      <div class="container mt-4" ref={topRef}>
        <h2 class="mb-3">Beatmapset Search</h2>
        <form class="mb-4" onSubmit={handleSearch}>
          <div class="input-group">
            <input
              type="text"
              class="form-control bg-primary rounded-0"
              placeholder="Search by title, artist, creator, tags..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button class="btn btn-secondary rounded-0" type="submit">Search</button>
          </div>
        </form>
        {loading && <div class="alert alert-info">Loading...</div>}
        {error && <div class="alert bg-danger">{error}</div>}
        <Pagination />
        <div class="row g-3 mb-3">
          {results.map(set => (
            <div className={`col-12 col-lg-6 ${!set.user_id ? 'missing-metadata' : ''}`} key={set.id}>
              <div class="border p-3 beatmapset-card-bg"
                style={{ 
                    background: `linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.85)), url('https://assets.ppy.sh/beatmaps/${set.id}/covers/cover.jpg')`
                }}
              >
                <div class="fw-bold">
                  <a class="text-decoration-none" href={`https://osu.ppy.sh/beatmapsets/${set.id}`} target="_blank">
                    <span class="text-white link-blue map-title">{!set.user_id ? 'Processing Metadata...' : set.title}</span>
                  </a>
                  </div>
                <div class="small d-flex align-items-center">
                  <div>by: <span class="text-secondary">{set.artist}</span></div>
                </div>
                <div class="small d-flex align-items-center">
                  <div>
                    <span>mapped by: </span>
                      <a class="text-decoration-none" href={`https://osu.ppy.sh/users/${set.user_id}`} target="_blank">
                        <span class="fw-bold text-white link-blue">{set.creator}</span>
                      </a>
                  </div>
                </div>
                <div class="small d-flex align-items-center gap-3">
                  <div>ID: <span class="text-secondary">{set.id}</span></div>
                  <div class="d-flex align-items-center gap-2">
                    <FaCircleCheck />
                    <span class="small">
                      {set.updated ? (() => {
                        const d = new Date(set.updated);
                        const day = d.getDate();
                        const month = d.toLocaleString('en-US', { month: 'short' });
                        const year = d.getFullYear();
                        return `${day} ${month} ${year}`;
                      })() : ''}
                    </span>
                  </div>
                </div>
                <div class="d-flex align-items-center gap-3 mb-2">
                  <span title="osu!standard" class="d-flex align-items-center gap-1">
                    <FaRegDotCircle />
                    <span class="small">{set.osu ?? 0}</span>
                  </span>
                  <span title="osu!taiko" class="d-flex align-items-center gap-1">
                    <FaDrum />
                    <span class="small">{set.taiko ?? 0}</span>
                  </span>
                  <span title="osu!catch" class="d-flex align-items-center gap-1">
                    <FaAppleWhole />
                    <span class="small">{set.fruits ?? 0}</span>
                  </span>
                  <span title="osu!mania" class="d-flex align-items-center gap-1">
                    <MdPiano />
                    <span class="small">{set.mania ?? 0}</span>
                  </span>
                </div>
                <div class="d-flex align-items-center gap-2">
                  <span class="badge border rounded-pill text-bg-dark">Status: {statusMap[set.status] ?? 'Unknown'}</span>
                  <a
                    class="btn btn-sm btn-success d-flex align-items-center gap-2"
                    href={`/api4/download/${set.id}`}
                  >
                    <span>Download {(set.file_size / (1024 ** 2)).toFixed(2)} MB</span>
                    <FaDownload color="white" />
                  </a>
                  <a
                    class="btn btn-sm btn-secondary d-flex align-items-center gap-2"
                    href={`osu://s/${set.id}`}
                  >
                    <span>osu!direct</span>
                    <FaDownload color="black" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Pagination />
      </div>
    </>
  );
}
