import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Instagram, Facebook, ArrowLeft } from 'lucide-react';
const API_BASE = 'http://localhost:8000/api/shopify';
import './Leads.css';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Outreach Modal State
  const [showOutreach, setShowOutreach] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [outreachTo, setOutreachTo] = useState('');
  const [outreachSubject, setOutreachSubject] = useState('');
  const [outreachBody, setOutreachBody] = useState('');
  const [sendingOutreach, setSendingOutreach] = useState(false);
  const [outreachSuccess, setOutreachSuccess] = useState(false);

  // Filters
  const [tier, setTier] = useState('');
  const [niche, setNiche] = useState('');
  const [country, setCountry] = useState('');
  const [sortBy, setSortBy] = useState('lead_score');

  const navigate = useNavigate();

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page,
        page_size: 20,
        sort_by: sortBy,
      });
      if (tier) queryParams.append('tier', tier);
      if (niche) queryParams.append('niche', niche);
      if (country) queryParams.append('country', country);

      const res = await fetch(`${API_BASE}/leads?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      setLeads(data.data);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, tier, niche, country, sortBy]);

  const handleCreateStore = (lead) => {
    navigate('/shopify/onboard', { 
      state: { url: lead.website_url, brandName: lead.name } 
    });
  };

  const handleOutreachClick = (lead) => {
    setSelectedLead(lead);
    setOutreachTo(lead.email || '');
    setOutreachSuccess(false);
    setOutreachSubject('Increase Your Sales by up to 40% with AI');
    setOutreachBody(`Hi ${lead.name || 'there'},\n\nI noticed your Shopify store and wanted to show you something we built for you. We created a custom AI shopping assistant trained on your products. Having an AI assistant can get your sales higher by up to 40% and conversion rate by 3-4 times.\n\nYou can test it out right now: http://localhost:5173/shopify/chat/${lead.mongo_store_id}\n\nLet me know what you think!`);
    setShowOutreach(true);
  };

  const handleSendOutreach = async () => {
    if (!outreachTo) {
      alert("Please provide an email address.");
      return;
    }
    setSendingOutreach(true);
    try {
      const res = await fetch(`${API_BASE}/outreach/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: selectedLead.mongo_store_id,
          recipient_email: outreachTo,
          subject: outreachSubject,
          body: outreachBody
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to send outreach');
      }
      setOutreachSuccess(true);
      setTimeout(() => setShowOutreach(false), 2000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSendingOutreach(false);
    }
  };

  return (
    <div className="leads-container">
      <div className="leads-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <h1>Ecommerce Lead Engine</h1>
        <p>Discover and engage with high-potential prospects</p>
      </div>

      <div className="leads-controls">
        <select value={tier} onChange={(e) => { setTier(e.target.value); setPage(1); }}>
          <option value="">All Tiers</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
        </select>
        
        <input 
          type="text" 
          placeholder="Filter by Niche..." 
          value={niche} 
          onChange={(e) => { setNiche(e.target.value); setPage(1); }}
        />
        
        <input 
          type="text" 
          placeholder="Filter by Country..." 
          value={country} 
          onChange={(e) => { setCountry(e.target.value); setPage(1); }}
        />

        <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
          <option value="lead_score">Sort by Score</option>
          <option value="created_at">Sort by Newest</option>
          <option value="niche">Sort by Niche</option>
        </select>
      </div>

      {error && <div className="leads-error">{error}</div>}

      {loading ? (
        <div className="leads-loading">Loading leads...</div>
      ) : (
        <div className="leads-grid">
          {leads.map(lead => (
            <div key={lead.business_id} className="lead-card">
              <div className="lead-card-header">
                <h3>{lead.name}</h3>
                <span className={`lead-tier tier-${lead.tier || 'unknown'}`}>{lead.tier || 'Unrated'}</span>
              </div>
              
              <div className="lead-card-body">
                <p><strong>Niche:</strong> {lead.niche || 'N/A'}</p>
                <p><strong>Country:</strong> {lead.country || 'N/A'}</p>
                <p><strong>URL:</strong> <a href={lead.website_url} target="_blank" rel="noreferrer">{lead.website_url}</a></p>
                <p><strong>Score:</strong> <span className="lead-score">{lead.lead_score || 0}</span></p>
                
                <div className="lead-socials flex gap-3 mt-3">
                  {lead.email && <Mail className="w-4 h-4 text-black/60" title={lead.email} />}
                  {lead.instagram && <Instagram className="w-4 h-4 text-black/60" title={lead.instagram} />}
                  {lead.facebook && <Facebook className="w-4 h-4 text-black/60" title={lead.facebook} />}
                </div>
              </div>

              <div className="lead-card-actions">
                {lead.assistant_created ? (
                  <button 
                    className="btn-primary success" 
                    onClick={() => navigate(`/shopify/chat/${lead.mongo_store_id}`)}
                  >
                    Launch Assistant
                  </button>
                ) : (
                  <button 
                    className="btn-primary"
                    onClick={() => handleCreateStore(lead)}
                  >
                    Create Store
                  </button>
                )}
                
                <button 
                  className="btn-secondary" 
                  disabled={!lead.assistant_created}
                  title={!lead.assistant_created ? "Create store first" : "Send Outreach"}
                  onClick={() => handleOutreachClick(lead)}
                >
                  Outreach
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && leads.length > 0 && (
        <div className="leads-pagination">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
          >
            &laquo; Prev
          </button>
          <span>Page {page} of {totalPages} (Total: {total})</span>
          <button 
            disabled={page === totalPages || totalPages === 0} 
            onClick={() => setPage(p => p + 1)}
          >
            Next &raquo;
          </button>
        </div>
      )}

      {showOutreach && (
        <div className="outreach-modal-overlay" onClick={() => setShowOutreach(false)}>
          <div className="outreach-modal" onClick={e => e.stopPropagation()}>
            <div className="outreach-modal-header">
              <h2>Send Outreach</h2>
              <button className="close-btn" onClick={() => setShowOutreach(false)}>&times;</button>
            </div>
            {outreachSuccess ? (
              <div className="outreach-success">
                <p>Email sent successfully!</p>
              </div>
            ) : (
              <div className="outreach-modal-body">
                <div className="input-group">
                  <label>To:</label>
                  <input 
                    type="text" 
                    value={outreachTo} 
                    onChange={(e) => setOutreachTo(e.target.value)} 
                  />
                </div>
                <div className="input-group">
                  <label>Subject:</label>
                  <input 
                    type="text" 
                    value={outreachSubject} 
                    onChange={(e) => setOutreachSubject(e.target.value)} 
                  />
                </div>
                <div className="input-group">
                  <label>Message:</label>
                  <textarea 
                    rows={8}
                    value={outreachBody} 
                    onChange={(e) => setOutreachBody(e.target.value)} 
                  />
                </div>
                <div className="outreach-modal-actions">
                  <button className="btn-secondary" onClick={() => setShowOutreach(false)}>Cancel</button>
                  <button 
                    className="btn-primary" 
                    onClick={handleSendOutreach}
                    disabled={sendingOutreach}
                  >
                    {sendingOutreach ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
