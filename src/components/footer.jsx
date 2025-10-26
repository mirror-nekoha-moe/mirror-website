import dayjs from 'dayjs';

const Footer = () => {
  return (
    <footer className="bg-black mt-5">
        <div className="text-center">
            <a href="https://github.com/mirror-nekoha-moe" target="_blank">GitHub</a>
            <br/>
            <span>Compiled on: {dayjs(__BUILD_DATE__).format('DD.MM.YYYY HH:mm:ss')}</span>
        </div>
    </footer>
  );
};
export default Footer;