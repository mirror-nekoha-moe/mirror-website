import { useState, useEffect } from 'react'
import { FaDownload, FaMagnet } from 'react-icons/fa';

const MODES = [
    { key: 'std', name: 'Standard' },
    { key: 'taiko', name: 'Taiko' },
    { key: 'catch', name: 'Catch' },
    { key: 'mania', name: 'Mania' },
];

const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_GB = 1024 * 1024 * 1024;

function formatSize(bytes) {
    if (bytes < BYTES_PER_GB) {
        const sizeMb = Math.round(bytes / BYTES_PER_MB);
        return `${sizeMb} MB`;
    }
    const sizeGb = Math.round(bytes / BYTES_PER_GB * 100) / 100;
    return `${sizeGb} GB`;
}

// api sends newest year first
function groupByYear(archives) {
    const years = [];
    for (const archive of archives) {
        let lastYear = years[years.length - 1];
        if (!lastYear || lastYear.year !== archive.year) {
            lastYear = { year: archive.year };
            years.push(lastYear);
        }
        lastYear[archive.mode] = archive;
    }
    return years;
}

function YearlyArchives() {
    const [archives, setArchives] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/api/archive/yearly')
            .then(response => {
                if (!response.ok)
                    throw new Error('Failed to fetch archives');
                return response.json();
            })
            .then(data => setArchives(data))
            .catch(err => setError(err.message));
    }, []);

    let years = [];
    if (archives) {
        years = groupByYear(archives);
    }

    return (
        <>
            <title>osu! Yearly Beatmap Archives | Nekoha</title>
            <meta name="description" content="Download every ranked, approved and loved osu! beatmap as yearly zip archives or torrents, one for each mode: standard, taiko, catch and mania." />
            <link rel="canonical" href="https://mirror.nekoha.moe/archives/yearly" />
            <div className="container py-4">
                <h1 className="h3">Yearly Archives</h1>
                <p className="text-muted">Ranked, approved and loved Beatmapsets by year and gamemode they got ranked.</p>

                {!archives && !error && (
                    <div className="search-loading-bar">
                        <div className="search-loading-bar-value" />
                    </div>
                )}

                {error && (
                    <div className="alert bg-danger" role="alert">
                        {error}
                    </div>
                )}

                {archives && years.length === 0 && (
                    <p className="text-muted">No archives yet</p>
                )}

                {years.length > 0 && (
                    <table className="table table-dark align-middle">
                        <thead>
                            <tr className="d-none d-xl-table-row">
                                <th className="col-xl-1">Year</th>
                                {MODES.map((mode) => (
                                    <th className="col-xl-2" key={mode.key}>{mode.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {years.map((year) => (
                                <tr className="d-flex flex-wrap d-xl-table-row" key={year.year}>
                                    <td className="col-12 col-xl-1 fw-bold">{year.year}</td>
                                    {MODES.map((mode) => (
                                        <td className="col-12 col-md-6 col-xl-2" key={mode.key}>
                                            {year[mode.key] && (
                                                <div className="d-flex gap-1">
                                                    <a className="btn btn-sm btn-success d-flex flex-grow-1 justify-content-center align-items-center gap-2" href={year[mode.key].url} title={`${year[mode.key].beatmapset_count} Beatmapsets`}>
                                                        <span className="d-xl-none">{mode.name}</span>
                                                        <span>{formatSize(year[mode.key].size)}</span>
                                                        <FaDownload color="white" />
                                                    </a>
                                                    <button type="button" className="btn btn-sm btn-secondary d-flex align-items-center" onClick={() => navigator.clipboard.writeText(year[mode.key].magnet)} disabled={!year[mode.key].magnet} title="Copy magnet link">
                                                        <FaMagnet color="black" />
                                                    </button>
                                                </div>
                                            )}
                                            {year[mode.key] && (
                                                <div className="small text-center mt-1" title="Peers / Seeds / Leechers">
                                                    {year[mode.key].peers ?? '?'} / {year[mode.key].seeds ?? '?'} / {year[mode.key].leechers ?? '?'}
                                                </div>
                                            )}
                                            {!year[mode.key] && (
                                                <span className="btn btn-sm btn-outline-secondary disabled d-flex w-100 justify-content-center align-items-center gap-2">
                                                    <span className="d-xl-none">{mode.name}</span>
                                                    <span>-</span>
                                                </span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}

export default YearlyArchives