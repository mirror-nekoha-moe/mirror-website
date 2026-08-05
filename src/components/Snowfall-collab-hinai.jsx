const FEATHERS = [
    { fx: '6%', fs: '26px', fd: '34s', fdl: '-4s', fsw: '34px', fdrift: '5vw', fr: '26s', fr0: '-18deg', fdir: 1 },
    { fx: '17%', fs: '17px', fd: '44s', fdl: '-19s', fsw: '-26px', fdrift: '-3vw', fr: '33s', fr0: '32deg', fdir: -1 },
    { fx: '29%', fs: '30px', fd: '29s', fdl: '-11s', fsw: '42px', fdrift: '7vw', fr: '21s', fr0: '8deg', fdir: 1 },
    { fx: '41%', fs: '20px', fd: '39s', fdl: '-26s', fsw: '-31px', fdrift: '-5vw', fr: '29s', fr0: '-40deg', fdir: -1 },
    { fx: '53%', fs: '24px', fd: '36s', fdl: '-7s', fsw: '28px', fdrift: '4vw', fr: '24s', fr0: '54deg', fdir: 1 },
    { fx: '65%', fs: '15px', fd: '47s', fdl: '-33s', fsw: '-22px', fdrift: '-6vw', fr: '36s', fr0: '-12deg', fdir: -1 },
    { fx: '76%', fs: '28px', fd: '31s', fdl: '-16s', fsw: '38px', fdrift: '6vw', fr: '22s', fr0: '24deg', fdir: 1 },
    { fx: '88%', fs: '19px', fd: '41s', fdl: '-2s', fsw: '-29px', fdrift: '-4vw', fr: '31s', fr0: '-56deg', fdir: -1 },
    { fx: '95%', fs: '22px', fd: '37s', fdl: '-23s', fsw: '25px', fdrift: '3vw', fr: '27s', fr0: '40deg', fdir: 1 },
    { fx: '35%', fs: '13px', fd: '52s', fdl: '-40s', fsw: '-18px', fdrift: '-2vw', fr: '40s', fr0: '70deg', fdir: -1 },
    { fx: '58%', fs: '16px', fd: '45s', fdl: '-13s', fsw: '20px', fdrift: '5vw', fr: '34s', fr0: '-30deg', fdir: 1 },
];

function Feather() {
    return (
        <svg viewBox="0 0 34 112" aria-hidden="true" focusable="false">
            <path
                fill="rgba(255,255,255,0.94)"
                d="M20.8 4 C23.6 10.6, 26.4 21, 27.5 32.4 C28.4 42, 27.8 54, 25.4 63.4 C23.6 70.2, 20 76, 16.2 79 C13.8 74.4, 11.8 69, 10.8 63.4 C9.6 56.6, 9.8 47.4, 10.9 38.6 C12.2 27.4, 15.4 14.6, 18.6 6 C19.2 4.6, 20 4, 20.8 4 Z"
            />
            <path
                fill="rgba(255,255,255,0.85)"
                d="M17.2 77.4 C16.8 85.4, 16.2 93.4, 15.2 101 C14.95 102.9, 13.6 102.7, 13.75 100.8 C14.5 93.4, 15 85.4, 15.6 77.4 Z"
            />
            <path
                fill="none"
                stroke="rgba(150,196,232,0.8)"
                strokeWidth="0.95"
                strokeLinecap="round"
                d="M20.6 6.4 C18.6 24, 17 48, 16.2 77"
            />
        </svg>
    );
}

function featherVars(f) {
    return {
        '--fx': f.fx,
        '--fs': f.fs,
        '--fd': f.fd,
        '--fdl': f.fdl,
        '--fsw': f.fsw,
        '--fdrift': f.fdrift,
        '--fr': f.fr,
        '--fr0': f.fr0,
        '--fdir': f.fdir,
    };
}

export function SnowfallFront() {
    return (
        <div className="nksnow nksnow--front" aria-hidden="true">
            <div className="nksnow__sheet nksnow__sheet--near" />
            <div className="nksnow__sheet nksnow__sheet--mid" />
        </div>
    );
}

export default function Snowfall() {
    return (
        <div className="nksnow" aria-hidden="true">
            <div className="nksnow__wash" />
            <div className="nksnow__horizon" />
            <div className="nksnow__sheet nksnow__sheet--far" />
            <div className="nksnow__sheet nksnow__sheet--mid" />
            <div className="nksnow__sheet nksnow__sheet--near" />
            {FEATHERS.map(f => (
                <span key={f.fx + f.fd} className="nksnow__feather" style={featherVars(f)}>
                    <span className="nksnow__feather-in">
                        <Feather />
                    </span>
                </span>
            ))}
        </div>
    );
}
