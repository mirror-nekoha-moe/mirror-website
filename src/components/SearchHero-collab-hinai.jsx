import { useEffect, useState } from 'react';
import { FaRegDotCircle, FaDrum } from 'react-icons/fa';
import { FaAppleWhole } from 'react-icons/fa6';
import { MdPiano } from 'react-icons/md';
import {
    fetchIndexStats,
    fetchRankedToday,
    formatBytes,
    formatCount,
    peekRankedToday,
    starTier,
} from '../lib/ranked-today-collab-hinai.js';
import { fetchMirrorHealth } from '../lib/mirror-collab-hinai.js';
import CollabMark, { HinaiSource, NekohaSource } from './CollabMark-collab-hinai.jsx';

const BG = '/assets/collab-hinai/search-hero-bg-collab-hinai.webp';

const MODE_ICONS = {
    osu: { Icon: FaRegDotCircle, title: 'osu!standard' },
    taiko: { Icon: FaDrum, title: 'osu!taiko' },
    fruits: { Icon: FaAppleWhole, title: 'osu!catch' },
    mania: { Icon: MdPiano, title: 'osu!mania' },
};

const SKELETON = [0, 1, 2, 3, 4, 5];

const SNOW = ['far', 'mid', 'near'];

function dayLabel(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
}

function timeLabel(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Card({ item, index, dupe }) {
    const tier = starTier(item.stars);
    return (
        <div
            className="nsh__slot"
            style={{
                '--bd': `${7 + ((index * 13) % 26) / 10}s`,
                '--bl': `${-(index * 1.4)}s`,
                '--ba': `${3 + (index % 3)}px`,
            }}
        >
            <a
                className="nsh__card"
                href={`/beatmapset/${item.id}`}
                aria-hidden={dupe || undefined}
                tabIndex={dupe ? -1 : 0}
                aria-label={`${item.title} by ${item.artist}, mapped by ${item.creator}`}
            >
                <img className="nsh__art" src={item.art} alt="" loading="lazy" width="400" height="200" />
                <span className="nsh__scrim" />

                <span className="nsh__badges">
                    {item.today && <span className="nsh__pip">{timeLabel(item.rankedAt)}</span>}
                    {item.stars > 0 && (
                        <span className={`nsh__sr nsh__sr--t${tier}`}>{item.stars.toFixed(2)}</span>
                    )}
                </span>

                <span className="nsh__label">
                    <b>{item.title}</b>
                    <small>{item.artist}</small>
                    <span className="nsh__by">
                        <span className="nsh__modes">
                            {item.modes.map(m => {
                                const entry = MODE_ICONS[m.key];
                                if (!entry) return null;
                                const { Icon, title } = entry;
                                return <Icon key={m.key} title={title} size={10} />;
                            })}
                        </span>
                        {item.creator}
                    </span>
                </span>
            </a>
        </div>
    );
}

export default function SearchHero() {
    const [data, setData] = useState(() => peekRankedToday());
    const [index, setIndex] = useState(null);
    const [health, setHealth] = useState(null);

    useEffect(() => {
        let alive = true;
        fetchRankedToday().then(next => {
            if (alive) setData(next);
        });
        fetchIndexStats().then(next => {
            if (alive) setIndex(next);
        });
        fetchMirrorHealth().then(next => {
            if (alive) setHealth(next);
        });
        return () => {
            alive = false;
        };
    }, []);

    const loading = !data;
    const items = data ? data.items : [];
    if (!loading && !items.length) return null;

    const today = data && data.mode === 'today';
    const track = items.length ? [...items, ...items] : [];

    return (
        <section className="nsh" aria-label={today ? 'Beatmaps ranked today' : 'Recently ranked beatmaps'}>
            <div className="nsh__bg" style={{ '--nsh-bg': `url('${BG}')` }} aria-hidden="true" />
            <div className="nsh__veil" aria-hidden="true" />
            <div className="nsh__aurora" aria-hidden="true" />
            {SNOW.map(s => (
                <div key={s} className={`nsh__snow nsh__snow--${s}`} aria-hidden="true" />
            ))}

            <header className="nsh__head">
                <span className="nsh__kicker">
                    <span className="nsh__dot" aria-hidden="true" />
                    {today ? 'Ranked today' : 'Recently ranked'}
                </span>
                <span className="nsh__meta">
                    {loading ? (
                        <span className="nsh__meta-ghost" />
                    ) : today ? (
                        <>
                            <b>{data.todayCount}</b> sets
                            <span className="nsh__sep" aria-hidden="true" />
                            {dayLabel(data.newest)}
                        </>
                    ) : (
                        <>
                            {data.todayCount > 0 && (
                                <>
                                    <b>{data.todayCount}</b> today
                                    <span className="nsh__sep" aria-hidden="true" />
                                </>
                            )}
                            {dayLabel(data.newest)}
                        </>
                    )}
                </span>
            </header>

            <div className="nsh__viewport">
                {loading ? (
                    <div className="nsh__track nsh__track--still">
                        {SKELETON.map(i => (
                            <div key={i} className="nsh__slot">
                                <span className="nsh__card nsh__card--ghost" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="nsh__track" style={{ '--n': items.length }}>
                        {track.map((item, i) => (
                            <Card
                                key={`${item.id}-${i}`}
                                item={item}
                                index={i}
                                dupe={i >= items.length}
                            />
                        ))}
                    </div>
                )}
                <span className="nsh__waterline" aria-hidden="true" />
            </div>

            <CollabMark size={17} className="nsh__tag" egg />

            {index && (
                <div className="nsh__prov">
                    <span><span className="nsh__prov-k">Beatmapsets</span> {formatCount(index.beatmapset_count)}</span>
                    <span className="nsh__prov-sep" />
                    <span><span className="nsh__prov-k">Difficulties</span> {formatCount(index.beatmap_count)}</span>
                    <span className="nsh__prov-sep" />
                    <span><span className="nsh__prov-k">Archive</span> {formatBytes(index.total_size)}</span>
                    <span className="nsh__prov-sep" />
                    {health && health.engines && health.engines.rosu_pp && (
                        <>
                            <span><span className="nsh__prov-k">Engine</span> rosu-pp {health.engines.rosu_pp}</span>
                            <span className="nsh__prov-sep" />
                        </>
                    )}
                    <span className="nsh__prov-src">
                        <span className="nsh__prov-k">Source</span>
                        <NekohaSource label="mirror.nekoha.moe" size={13} />
                        <span className="nsh__prov-amp" aria-hidden="true">&amp;</span>
                        <HinaiSource size={13} version={health && health.version} />
                    </span>
                </div>
            )}
        </section>
    );
}
