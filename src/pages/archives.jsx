import { useState, useEffect } from 'react'
import dayjs from 'dayjs';
import { FaDownload } from 'react-icons/fa';

const MODES = [
    { key: 'std', name: 'Standard' },
    { key: 'taiko', name: 'Taiko' },
    { key: 'catch', name: 'Catch' },
    { key: 'mania', name: 'Mania' },
];

// api sends newest month first
function groupByYear(archives) {
    const years = [];
    for (const archive of archives) {
        const year = archive.month.slice(0, 4);

        let lastYear = years[years.length - 1];
        if (!lastYear || lastYear.year !== year) {
            lastYear = { year, months: [], totals: { std: 0, taiko: 0, catch: 0, mania: 0 } };
            years.push(lastYear);
        }
        lastYear.totals[archive.mode] += archive.beatmapset_count;

        let lastMonth = lastYear.months[lastYear.months.length - 1];
        if (!lastMonth || lastMonth.month !== archive.month) {
            lastMonth = { month: archive.month, counts: { std: 0, taiko: 0, catch: 0, mania: 0 } };
            lastYear.months.push(lastMonth);
        }
        lastMonth[archive.mode] = archive;
        lastMonth.counts[archive.mode] = archive.beatmapset_count;
    }
    return years;
}

function Archives() {
    const [archives, setArchives] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/api/archive')
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
            <title>osu! Beatmap Archives | Nekoha</title>
            <meta name="description" content="Download every ranked, approved and loved osu! beatmap as monthly zip archives, one for each mode: standard, taiko, catch and mania." />
            <link rel="canonical" href="https://mirror.nekoha.moe/archives" />
            <div className="container py-4">
                <h1 className="h3">Archives</h1>
                <p className="text-muted">Ranked, approved and loved beatmapsets by the month they got ranked (UTC), one zip per mode.</p>

                {!archives && !error && (
                    <div className="text-center">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
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

                {years.map((year) => (
                    <div key={year.year}>
                        <h2 className="h5 mt-4 d-none d-md-block">{year.year}</h2>
                        <table className="table table-dark align-middle">
                            <thead>
                                <tr className="d-none d-md-table-row">
                                    <th className="col-md-4">Month</th>
                                    {MODES.map((mode) => (
                                        <th className="col-md-2" key={mode.key}>{mode.name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {year.months.map((month) => (
                                    <tr className="d-flex flex-wrap d-md-table-row" key={month.month}>
                                        <td className="col-12 col-md-4 fw-bold">
                                            <span className="d-md-none">{year.year} </span>{dayjs(`${month.month}-01`).format('MMMM')}
                                            <span className="d-md-none fw-normal float-end" title="Standard / Taiko / Catch / Mania">
                                                {`${month.counts.std}/${month.counts.taiko}/${month.counts.catch}/${month.counts.mania}`}
                                            </span>
                                        </td>
                                        {MODES.map((mode) => (
                                            <td className="col-12 col-sm-6 col-md-2" key={mode.key}>
                                                {month[mode.key] && (
                                                    <a className="btn btn-sm btn-success d-flex w-100 justify-content-center align-items-center gap-2" href={month[mode.key].url} title={`${month[mode.key].beatmapset_count} Beatmapsets`}>
                                                        <span className="d-md-none">{mode.name}</span>
                                                        <span>{month[mode.key].size_gb} GB</span>
                                                        <FaDownload color="white" />
                                                    </a>
                                                )}
                                                {!month[mode.key] && (
                                                    <span className="btn btn-sm btn-outline-secondary disabled d-flex w-100 justify-content-center align-items-center gap-2">
                                                        <span className="d-md-none">{mode.name}</span>
                                                        <span>-</span>
                                                    </span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="d-none d-md-table-row">
                                    <td className="col-md-4 fw-bold">Total</td>
                                    {MODES.map((mode) => (
                                        <td className="col-md-2 text-center" key={mode.key}>
                                            {year.totals[mode.key]} Beatmapsets
                                        </td>
                                    ))}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ))}
            </div>
        </>
    );
}

export default Archives