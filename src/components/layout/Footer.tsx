import React from 'react';
import { Link } from 'react-router-dom';
import { Theater, Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-luxury-deep border-t border-luxury-gold/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gradient-to-r from-luxury-gold to-yellow-500 p-2 rounded-lg">
                <Theater className="h-6 w-6 text-luxury-deep" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-white">
                  UPAT Ticketing System
                </h3>
                <p className="text-sm text-luxury-champagne opacity-80">
                  University of Makati Performing Arts and Theater
                </p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4 max-w-md">
              Experience world-class performances and cultural events at the University of Makati's 
              premier performing arts venue. Book your tickets online for a seamless theater experience.
            </p>
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="text-gray-400 hover:text-luxury-gold transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-luxury-gold transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-luxury-gold transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/events" 
                  className="text-gray-400 hover:text-luxury-gold transition-colors text-sm"
                >
                  All Events
                </Link>
              </li>
              <li>
                <Link 
                  to="/events?category=theater" 
                  className="text-gray-400 hover:text-luxury-gold transition-colors text-sm"
                >
                  Theater Productions
                </Link>
              </li>
              <li>
                <Link 
                  to="/events?category=academic" 
                  className="text-gray-400 hover:text-luxury-gold transition-colors text-sm"
                >
                  Academic Events
                </Link>
              </li>
              <li>
                <Link 
                  to="/events?category=performance" 
                  className="text-gray-400 hover:text-luxury-gold transition-colors text-sm"
                >
                  Performances
                </Link>
              </li>
              <li>
                <Link 
                  to="/events?category=competition" 
                  className="text-gray-400 hover:text-luxury-gold transition-colors text-sm"
                >
                  Competitions
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-luxury-gold mt-0.5 flex-shrink-0" />
                <div className="text-gray-400 text-sm">
                  <p>University of Makati</p>
                  <p>J.P. Rizal Extension, West Rembo</p>
                  <p>Makati City, Metro Manila</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-luxury-gold flex-shrink-0" />
                <span className="text-gray-400 text-sm">+63 2 8883-1863</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-luxury-gold flex-shrink-0" />
                <span className="text-gray-400 text-sm">upat@umak.edu.ph</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm">
            &copy; {currentYear} University of Makati Performing Arts and Theater. All rights reserved.
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-luxury-gold text-sm transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-400 hover:text-luxury-gold text-sm transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-gray-400 hover:text-luxury-gold text-sm transition-colors">
              Accessibility
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
