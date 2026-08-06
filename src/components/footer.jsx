import dayjs from 'dayjs';
import { GithubMark, NEKOHA_GITHUB_URL } from './CollabMark-collab-hinai.jsx';

const Footer = () => {
  return (
    <footer className="mx-auto mt-5 p-2 card rounded-0">
      <div className="card-body text-center">
        <div class="row align-items-center mb-2">
          <a class="col-12 link-blue" href="https://discord.gg/QNCmZBqwBQ" target="_blank">Discord Server</a>
          <a class="col-12 link-blue nk-ghlink" href={NEKOHA_GITHUB_URL} target="_blank" rel="noopener noreferrer">
            <GithubMark />
            GitHub
          </a>
        </div>
        <span>Compiled on: {dayjs(__BUILD_DATE__).format('DD.MM.YYYY HH:mm:ss')}</span>
      </div>
    </footer>
  );
};
export default Footer;