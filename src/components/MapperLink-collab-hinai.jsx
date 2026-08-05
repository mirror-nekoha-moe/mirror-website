import { useEffect, useRef, useState } from 'react';
import { observeOnce, unobserve } from '../lib/inview-collab-hinai.js';
import { mapperUrl, proxyImage, peekMapperAvatar, fetchMapperAvatar } from '../lib/mirror-collab-hinai.js';

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
