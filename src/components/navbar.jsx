import { NavLink } from "react-router-dom";

const Navbar = () => {
    const handleLinkClick = (e, url) => {
        // Prevent default behavior to control the page reload
        e.preventDefault();
        setTimeout(() => {
            window.location.href = url;
        }, 0); 
    };

    return (
        <div class="top-container">
            <nav class="navbar navbar-expand-md bg-card">
                <div class="container-fluid">
                    <a href="/" class="navbar-brand">mirror.nekoha.moe</a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-content" aria-controls="navbarTogglerDemo02" aria-expanded="false" aria-label="Toggle navigation">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbar-content">
                        <ul class="navbar-nav w-100">
                            <li class="nav-item">
                                <a href="/" class="nav-link" onClick={(e) => handleLinkClick(e, "/")}>Home</a>
                            </li>
                            <li class="nav-item">
                                <a href="/search" class="nav-link" onClick={(e) => handleLinkClick(e, "/search")}>Beatmaps</a>
                            </li>
                            <li class="nav-item dropdown">
                                <a href="/archives" class="nav-link dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-expanded="false">Archives</a>
                                <ul class="dropdown-menu">
                                    <li>
                                        <a href="/archives/monthly" class="dropdown-item nav-link" onClick={(e) => handleLinkClick(e, "/archives/monthly")}>Monthly</a>
                                    </li>
                                    <li>
                                        <a href="/archives/yearly" class="dropdown-item nav-link" onClick={(e) => handleLinkClick(e, "/archives/yearly")}>Yearly</a>
                                    </li>
                                </ul>
                            </li>
                            <li class="nav-item">
                                <a href="https://db.mirror.nekoha.moe/#/base/2ef0a92c-12b4-46a3-b0b2-a9ef7da376f3" class="nav-link">Database</a>
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
export default Navbar