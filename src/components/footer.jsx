import dayjs from 'dayjs';

const Footer = () => {
  return (
    <footer className="container mx-auto mt-5 card rounded-0 mb-3">
      <div className="card-body text-center">
        <div class="row align-items-center mb-2">
          <a class="col-12 link-blue" href="https://discord.gg/QNCmZBqwBQ" target="_blank">Discord Server</a>
          <a class="col-12 link-blue" href="https://github.com/mirror-nekoha-moe" target="_blank">GitHub</a>
        </div>
        <span>Compiled on: {dayjs(__BUILD_DATE__).format('DD.MM.YYYY HH:mm:ss')}</span>
      </div>
    </footer>
  );
};
export default Footer;