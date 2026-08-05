import { useEffect, useState } from 'react';
import { mapperUrl, proxyImage, peekMapperAvatar, fetchMapperAvatar } from '../lib/mirror.js';

export default function MapperLink({ name, avatar = false }) {
    const [src, setSrc] = useState(() => peekMapperAvatar(name) || null);

    useEffect(() => {
        if (!avatar || !name || peekMapperAvatar(name) !== undefined) return undefined;
        let active = true;
        fetchMapperAvatar(name).then(url => {
            if (active && url) setSrc(url);
        });
        return () => { active = false; };
    }, [avatar, name]);

    if (!name) return <span className="text-muted">Unknown</span>;

    return (
        <a
            className="mapper-link link-blue text-decoration-none d-inline-flex align-items-center gap-1"
            href={mapperUrl(name)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            title={`${name} on Hinamizawa`}
        >
            {avatar && src && (
                <img className="mapper-link__avatar" src={proxyImage(src)} alt="" loading="lazy" />
            )}
            <span className="text-truncate">{name}</span>
        </a>
    );
}
