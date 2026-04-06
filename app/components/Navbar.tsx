import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
    return (
        <nav className="navbar flex justify-between items-center p-4">
            <Link to="/">
                <p className="text-2xl font-bold text-gradient">Resumind</p>
            </Link>
            <Link to="/upload" className="primary-button w-fit">
                Upload Resume
            </Link>
        </nav>
    );
};

export default Navbar;