import { NavLink } from "react-router-dom";
import { GithubMark, NEKOHA_URL } from "./CollabMark-collab-hinai.jsx";

/**
 * Public path to the Nekoha brand mark shown beside the wordmark.
 *
 * Served from `public/` rather than imported, so it is referenced by URL and is
 * not fingerprinted by the bundler.
 * @type {string}
 */
const NEKOHA_MARK = "/assets/collab-hinai/nekoha-mark-collab-hinai.webp";

/**
 * The site-wide top navigation bar, mounted once above the router.
 *
 * Renders the Bootstrap navbar (brand, collapse toggle, the Home / Beatmaps /
 * Packs / Graveyard PP links, a Request dropdown, and an external Docs link)
 * plus a permanently `d-none` maintenance banner underneath, kept in the markup
 * so the notice can be switched on by dropping that one class.
 *
 * Navigation never goes through the router: the menu links are plain `<a>`
 * elements routed through {@link handleLinkClick}, and the brand anchor is a
 * bare `<a href="/">` with no handler at all, so every one of them performs a
 * full document load rather than a client-side transition.
 * @returns {JSX.Element} The navbar and its maintenance banner slot.
 */
const Navbar = () => {
  /**
   * Turns an in-site nav click into a full document load instead of a
   * client-side route change.
   *
   * Cancels the anchor's own navigation and then assigns `window.location.href`
   * from a zero-delay timeout, which yields to the current event loop turn so
   * the click handler unwinds (and Bootstrap's collapse/dropdown handlers get
   * to run) before the document is torn down.
   *
   * @param {import('react').MouseEvent<HTMLAnchorElement>} e - The click event, whose default is suppressed.
   * @param {string} url - Destination path to load, e.g. `"/search"`.
   * @returns {void}
   */
  const handleLinkClick = (e, url) => {
    // Prevent default behavior to control the page reload
    e.preventDefault();
    
    // Trigger page reload after navigation
    setTimeout(() => {
      window.location.href = url;  // Forces a full page reload
    }, 0); 
  };

    return (
        <div class="top-container">
            <nav class="navbar navbar-expand-md bg-card nk-nav">
                <div class="container-fluid nk-nav__inner">
                    <div class="nk-nav__lead">
                        <a href="/" class="navbar-brand nk-nav__brand">
                            <span class="nk-nav__brandname">mirror.nekoha.moe</span>
                            <img class="nk-nav__logo" src={NEKOHA_MARK} alt="" width="26" height="26" />
                        </a>
                    </div>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-content" aria-controls="navbarTogglerDemo02" aria-expanded="false" aria-label="Toggle navigation">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                        <div class="collapse navbar-collapse nk-nav__menu" id="navbar-content">
                            <ul class="navbar-nav w-100">
                                <li class="nav-item">
                                    <a href="/" class="nav-link" onClick={(e) => handleLinkClick(e, "/")}>Home</a>
                                </li>
                                <li class="nav-item">
                                    <a href="/search" class="nav-link" onClick={(e) => handleLinkClick(e, "/search")}>Beatmaps</a>
                                </li>
                                <li class="nav-item">
                                    <a href="/packs" class="nav-link" onClick={(e) => handleLinkClick(e, "/packs")}>Packs</a>
                                </li>
                                <li class="nav-item">
                                    <a href="/graveyard" class="nav-link" onClick={(e) => handleLinkClick(e, "/graveyard")}>Graveyard PP</a>
                                </li>
                                <li class="nav-item dropdown">
                                    <a href="#" class="nav-link dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-expanded="false">Request</a>
                                    <ul class="dropdown-menu">
                                        <li class="dropdown-item">
                                            <a href="/request" class="nav-link" onClick={(e) => handleLinkClick(e, "/request")}>Request Beatmap</a>
                                        </li>
                                        <li class="dropdown-item">
                                            <a href="/requests" class="nav-link" onClick={(e) => handleLinkClick(e, "/requests")}>View Requests</a>
                                        </li>
                                    </ul>
                                </li>
                                <li class="nav-item">
                                    <a href={NEKOHA_URL} class="nav-link nk-nav__docs" target="_blank" rel="noopener noreferrer" title="mirror-server API docs on GitHub">
                                        <GithubMark className="nk-nav__gh" />
                                        Docs
                                    </a>
                                </li>
                            </ul>
                    </div>
                </div>
            </nav>
            <div className="bg-danger w-100 p-2 text-center d-none">
                <a className="text-white fw-bold">API is temporarily offline due to maintenance</a>
            </div>
        </div>
      );
};

export default Navbar;
