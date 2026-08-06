import { useEffect, useRef, useState } from 'react';
import { observeOnce, unobserve } from '../lib/inview-collab-hinai.js';
import { mapperUrl, proxyImage, peekMapperAvatar, fetchMapperAvatar } from '../lib/mirror-collab-hinai.js';

/**
 * Renders a mapper credit as a link to that mapper's Hinamizawa portfolio.
 *
 * With `avatar` set, the portrait is resolved lazily: a cached answer from
 * `peekMapperAvatar` is used synchronously, and only on a cache miss is the
 * anchor handed to `observeOnce` so the network fetch waits until the credit
 * actually scrolls into view. Search results render many of these at once, so
 * fetching eagerly would issue a request per row for portraits nobody sees.
 * The effect guards its own resolution with an `active` flag and unobserves on
 * teardown, so a fetch that lands after unmount cannot set state.
 *
 * Clicks are stopped from propagating because these links sit inside beatmap
 * cards that are themselves clickable.
 *
 * @param {object} props
 * @param {string} props.name - Mapper username. Falsy renders a muted "Unknown" instead of a link.
 * @param {boolean} [props.avatar=false] - Whether to show the mapper's portrait beside the name.
 * @returns {JSX.Element} The mapper link, or a muted placeholder when there is no name.
 */
export default function MapperLink({ name, avatar = false }) {
    const [src, setSrc] = useState(() => peekMapperAvatar(name) || null);
    const anchorRef = useRef(null);

    useEffect(() => {
        if (!avatar || !name) return undefined;

        const known = peekMapperAvatar(name);
        if (known !== undefined) {
            setSrc(known);
            return undefined;
        }

        const node = anchorRef.current;
        let active = true;

        observeOnce(node, () => {
            fetchMapperAvatar(name).then(url => {
                if (active && url) setSrc(url);
            });
        });

        return () => {
            active = false;
            unobserve(node);
        };
    }, [avatar, name]);

    if (!name) return <span className="text-muted">Unknown</span>;

    return (
        <a
            ref={anchorRef}
            className="mapper-link link-blue text-decoration-none d-inline-flex align-items-center gap-1"
            href={mapperUrl(name)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            title={`${name} on Hinamizawa`}
        >
            {avatar && (
                <span className="mapper-link__avatar">
                    {src && <img src={proxyImage(src)} alt="" loading="lazy" />}
                </span>
            )}
            <span className="text-truncate">{name}</span>
        </a>
    );
}
