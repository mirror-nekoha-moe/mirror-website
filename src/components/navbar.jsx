import { NavLink } from "react-router-dom";

const Navbar = () => {
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
                                    <a href="/monitor" class="nav-link" onClick={(e) => handleLinkClick(e, "/monitor")}>Monitor</a>
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
