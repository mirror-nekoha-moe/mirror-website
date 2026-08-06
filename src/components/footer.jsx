import dayjs from 'dayjs';
import { GithubMark, NEKOHA_GITHUB_URL } from './CollabMark-collab-hinai.jsx';

/**
 * The site footer, mounted once below the router outlet.
 *
 * Carries the Discord invite, the Nekoha GitHub org link, a copyright line and a
 * build stamp.
 *
 * The two dates are deliberately read from different clocks. The copyright's end
 * year comes from `dayjs()` at RENDER time, so a tab left open across New Year and
 * a stale cached bundle both still show the right year without a redeploy. The
 * stamp reads `__BUILD_DATE__`, a global the bundler substitutes at COMPILE time,
 * so it reports when this bundle was built and not the current clock; it doubles
 * as the quickest way to confirm which deploy a visitor is actually running.
 * @returns {JSX.Element} The footer card.
 */
const Footer = () => {
  return (
    <footer className="mx-auto mt-5 p-2 card rounded-0">
      <div className="card-body text-center">
        <div className="row align-items-center mb-2">
          <a className="col-12 link-blue" href="https://discord.gg/QNCmZBqwBQ" target="_blank" rel="noopener noreferrer">Discord Server</a>
          <a className="col-12 link-blue nk-ghlink" href={NEKOHA_GITHUB_URL} target="_blank" rel="noopener noreferrer">
            <GithubMark />
            GitHub
          </a>
        </div>
        <span className="d-block">&copy; November 2025 &ndash; {dayjs().year()}</span>
        <span>Compiled on: {dayjs(__BUILD_DATE__).format('DD.MM.YYYY HH:mm:ss')}</span>
      </div>
    </footer>
  );
};
export default Footer;