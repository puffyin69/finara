"use client";
import React, { useState } from "react";
import {
  Menu,
} from "@/components/ui/navbar-menu";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["Latin"],
  weight: ["400", "700"],
});

export default function Navbar({ className }) {
  const [active, setActive] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className={cn("fixed top-4 sm:top-10 inset-x-0 max-w-7xl mx-auto z-50 px-4", className)}
    >
      <Menu
        setActive={setActive}
        className="flex items-center justify-between w-full"
      >
        <Link 
          href="/" 
          className={`${outfit.className} text-white text-lg hover:text-gray-300 transition-colors`}
        >
          Finora
        </Link>
        <div className="hidden sm:flex items-center gap-8">
          <Link 
            href="/about" 
            className={`${outfit.className} text-white hover:text-gray-300 transition-colors`}
          >
            About
          </Link>
          <Link 
            href="/contact" 
            className={`${outfit.className} text-white hover:text-gray-300 transition-colors`}
          >
            Contact
          </Link>
          <Link 
            href="/services" 
            className={`${outfit.className} text-white hover:text-gray-300 transition-colors`}
          >
            Services
          </Link>
          <Link 
            href="/portfolio" 
            className={`${outfit.className} text-white hover:text-gray-300 transition-colors`}
          >
            Portfolio
          </Link>
        </div>
        
        {/* Mobile Hamburger Button */}
        <button
          className="sm:hidden flex flex-col justify-center items-center w-6 h-6 space-y-1"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span
            className={`block w-5 h-0.5 bg-white transition-all duration-300 ${
              mobileMenuOpen ? "rotate-45 translate-y-1.5" : ""
            }`}
          ></span>
          <span
            className={`block w-5 h-0.5 bg-white transition-all duration-300 ${
              mobileMenuOpen ? "opacity-0" : ""
            }`}
          ></span>
          <span
            className={`block w-5 h-0.5 bg-white transition-all duration-300 ${
              mobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
            }`}
          ></span>
        </button>
      </Menu>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden absolute top-full left-4 right-4 mt-2 bg-black/90 backdrop-blur-sm rounded-lg border border-white/20 shadow-xl">
          <div className="flex flex-col py-4">
            <Link 
              href="/about" 
              className={`${outfit.className} text-white px-6 py-3 hover:bg-white/10 transition-colors`}
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link 
              href="/contact" 
              className={`${outfit.className} text-white px-6 py-3 hover:bg-white/10 transition-colors`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>
            <Link 
              href="/services" 
              className={`${outfit.className} text-white px-6 py-3 hover:bg-white/10 transition-colors`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Services
            </Link>
            <Link 
              href="/portfolio" 
              className={`${outfit.className} text-white px-6 py-3 hover:bg-white/10 transition-colors`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Portfolio
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
