function Archives() {
    return (
        <>
            <title>osu! Beatmap Archives | Nekoha</title>
            <meta name="description" content="Download every ranked, approved and loved osu! beatmap as monthly or yearly zip archives, one for each mode: standard, taiko, catch and mania." />
            <link rel="canonical" href="https://mirror.nekoha.moe/archives" />
            <div className="container py-4">
                <h1 className="h3">Archives</h1>
                <p className="text-muted">Ranked, approved and loved Beatmapsets by month or year and gamemode they got ranked.</p>

                <div className="row g-3">
                    <div className="col-12 col-md-6">
                        <div className="card h-100">
                            <div className="card-body d-flex flex-column">
                                <p className="h5 card-title">Monthly</p>
                                <p className="text-muted">Zip per month and gamemode.</p>
                                <a className="btn btn-success mt-auto" href="/archives/monthly">Monthly Archives</a>
                            </div>
                        </div>
                    </div>
                    <div className="col-12 col-md-6">
                        <div className="card h-100">
                            <div className="card-body d-flex flex-column">
                                <p className="h5 card-title">Yearly</p>
                                <p className="text-muted">Zip or torrent per year and gamemode.</p>
                                <a className="btn btn-success mt-auto" href="/archives/yearly">Yearly Archives</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Archives