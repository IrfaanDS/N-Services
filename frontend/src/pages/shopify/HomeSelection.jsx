import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Rocket, Mail, BarChart3 } from 'lucide-react';
import './HomeSelection.css';

export default function HomeSelection() {
  const navigate = useNavigate();

  return (
    <div className="home-selection-container">
      <div className="home-selection-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn-minimal" style={{ marginBottom: '1.5rem', opacity: 0.7, fontSize: '0.9rem', cursor: 'pointer', background: 'none', border: 'none', color: '#64748d' }}>
          &larr; Back to Platform
        </button>
        <h1>Welcome to the Platform</h1>
        <p>Select a module to continue</p>
      </div>
      
      <div className="home-cards">
        <div className="home-card" onClick={() => navigate('/shopify/dashboard')}>
          <div className="card-icon"><BarChart3 className="w-10 h-10 mx-auto" /></div>
          <div className="card-content">
            <h2>Dashboard</h2>
            <p>Analytics, lead tiers, AI adoption rates, and niche insights.</p>
          </div>
          <div className="card-action">
            <span>View Analytics</span> &rarr;
          </div>
        </div>

        <div className="home-card">
          <div className="card-icon"><Bot className="w-10 h-10 mx-auto" /></div>
          <div className="card-content">
            <h2>AI Store Assistant</h2>
            <p>Manage store integrations, RAG documents, and conversation history.</p>
          </div>
          <div className="card-actions-row">
            <button className="module-btn primary" onClick={() => navigate('/shopify/launch')}>Launch</button>
            <button className="module-btn" onClick={() => navigate('/shopify/onboard')}>Onboard</button>
            <button className="module-btn outline" onClick={() => navigate('/shopify/admin')}>Admin</button>
          </div>
        </div>

        <div className="home-card lead-engine" onClick={() => navigate('/shopify/leads')}>
          <div className="card-icon"><Rocket className="w-10 h-10 mx-auto" /></div>
          <div className="card-content">
            <h2>Ecommerce Lead Engine</h2>
            <p>Discover, qualify, and outreach to new ecommerce prospects.</p>
          </div>
          <div className="card-action">
            <span>Enter Module</span> &rarr;
          </div>
        </div>

        <div className="home-card mail-engine" onClick={() => navigate('/seo/email-generation')}>
          <div className="card-icon"><Mail className="w-10 h-10 mx-auto" /></div>
          <div className="card-content">
            <h2>Email Campaigns</h2>
            <p>Generate high-converting sequences and manage outreach.</p>
          </div>
          <div className="card-action">
            <span>Go to Mail</span> &rarr;
          </div>
        </div>
      </div>
      
      {/* Decorative blurred background elements */}
      <div className="login-blob blob-1"></div>
      <div className="login-blob blob-2"></div>
    </div>
  );
}
