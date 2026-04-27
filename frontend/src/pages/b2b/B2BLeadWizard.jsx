import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Building2, Users, Target, Search, CheckCircle2, AlertCircle,
    ArrowRight, Loader2, Wand2, UploadCloud, MapPin, 
    MonitorSmartphone, HeartPulse, BadgeDollarSign, BookOpen,
    ShoppingCart, Factory, Coffee, HelpCircle, Briefcase, ChevronRight, Check,
    Mail, Phone, Linkedin, Facebook, Instagram, Globe, Download, MousePointer2
} from 'lucide-react'
import { b2bLeadsAPI } from '../../services/api'
import Papa from 'papaparse'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix leaflet marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
    useMapEvents({
        click(e) {
            setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });

    return position === null ? null : (
        <Marker position={position}>
            <Popup>Selected Location</Popup>
        </Marker>
    );
}

// ── Icons for industries ──
const INDUSTRIES = [
    { name: 'Technology', icon: MonitorSmartphone },
    { name: 'Healthcare', icon: HeartPulse },
    { name: 'Finance', icon: BadgeDollarSign },
    { name: 'Education', icon: BookOpen },
    { name: 'Retail', icon: ShoppingCart },
    { name: 'Manufacturing', icon: Factory },
    { name: 'Hospitality', icon: Coffee },
    { name: 'Other', icon: HelpCircle }
]

const TEAM_SIZES = [
    '1-10 employees',
    '11-50 employees',
    '51-200 employees',
    '201-500 employees',
    '501-1000 employees',
    '1000+ employees'
]

const STEPS = [
    'Organization Details',
    'Location',
    'Industry',
    'Team Size',
    'Target Audience',
    'Upload Leads'
]

export default function B2BLeadWizard() {
    const navigate = useNavigate()
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const [activeStep, setActiveStep] = useState(0)
    const [error, setError] = useState(null)
    const [successMsg, setSuccessMsg] = useState(null)

    // Step 1: Org Details
    const [orgName, setOrgName] = useState('')
    const [orgDesc, setOrgDesc] = useState('')

    // Step 2: Location
    const [locationText, setLocationText] = useState('')
    const [mapPosition, setMapPosition] = useState(null) // {lat, lng}

    // Step 3: Industry
    const [selectedIndustry, setSelectedIndustry] = useState('')

    // Step 4: Team Size
    const [teamSize, setTeamSize] = useState('')

    // Step 5: Audience Strategy
    const [audienceStrategy, setAudienceStrategy] = useState('') // 'ai' or 'manual'
    const [isGenerating, setIsGenerating] = useState(false)
    const [audienceData, setAudienceData] = useState(null)

    // Step 5 Manual inputs
    const [manualIndustries, setManualIndustries] = useState('')
    const [manualSizes, setManualSizes] = useState('')
    const [manualSeniority, setManualSeniority] = useState('')
    const [manualFunctions, setManualFunctions] = useState('')
    const [manualLocations, setManualLocations] = useState('')

    // Step 6: Upload & Preview
    const [isUploading, setIsUploading] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [previewLeads, setPreviewLeads] = useState([])
    const [selectedFile, setSelectedFile] = useState(null)
    const [mustHave, setMustHave] = useState({ email: false, linkedin: false, website: false })

    // ── Filtering Logic ──
    const filteredLeads = useMemo(() => {
        return previewLeads.filter(lead => {
            if (mustHave.email && (!lead.email || lead.email === 'Not Found' || lead.email.trim() === '')) return false
            if (mustHave.linkedin && (!lead.linkedin || lead.linkedin.trim() === '')) return false
            if (mustHave.website && (!lead.website || lead.website.trim() === '')) return false
            return true
        })
    }, [previewLeads, mustHave])

    const toggleMustHave = (key) => {
        setMustHave(prev => ({ ...prev, [key]: !prev[key] }))
    }

    // Sync map position to location text
    useEffect(() => {
        if (mapPosition) {
            setLocationText(`Lat: ${mapPosition.lat.toFixed(4)}, Lng: ${mapPosition.lng.toFixed(4)}`)
        }
    }, [mapPosition])

    // ── Navigation ──
    const handleNext = () => {
        setError(null)
        setActiveStep(prev => prev + 1)
    }

    const handleBack = () => {
        setError(null)
        setActiveStep(prev => prev - 1)
    }

    // ── Validation ──
    const isNextDisabled = () => {
        if (activeStep === 0) return !orgName.trim() || !orgDesc.trim()
        if (activeStep === 1) return !locationText.trim() && !mapPosition
        if (activeStep === 2) return !selectedIndustry
        if (activeStep === 3) return !teamSize
        if (activeStep === 4) return !audienceData
        if (activeStep === 5) return previewLeads.length === 0
        return false
    }

    // ── Generate AI Audience ──
    const handleGenerateAudience = async () => {
        setError(null)
        setIsGenerating(true)
        try {
            const businessDescription = `
Organization Name: ${orgName}
Description: ${orgDesc}
Location: ${locationText}
Industry: ${selectedIndustry}
Team Size: ${teamSize}
            `.trim()

            const res = await b2bLeadsAPI.generateAudience({ business_description: businessDescription })
            setAudienceData(res.data)
            setAudienceStrategy('ai')
        } catch (err) {
            console.error(err)
            setError(err.response?.data?.detail || 'Failed to generate audience criteria.')
        } finally {
            setIsGenerating(false)
        }
    }

    // ── Manual Confirm ──
    const handleManualConfirm = () => {
        setAudienceData({
            company_attributes: {
                industries_include: manualIndustries.split(',').map(s => s.trim()).filter(Boolean),
                company_sizes: manualSizes.split(',').map(s => s.trim()).filter(Boolean),
            },
            job_title_attributes: {
                seniority: manualSeniority.split(',').map(s => s.trim()).filter(Boolean),
                job_functions: manualFunctions.split(',').map(s => s.trim()).filter(Boolean),
            },
            location_attributes: {
                countries_include: manualLocations.split(',').map(s => s.trim()).filter(Boolean),
            }
        })
        setAudienceStrategy('manual')
    }

    // ── File Upload ──
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setSelectedFile(file)
        setIsUploading(true)
        setError(null)
        setSuccessMsg(null)

        try {
            const res = await b2bLeadsAPI.uploadCSV(file)
            const leads = res.data.data || []
            setPreviewLeads(leads)
            if (leads.length > 0) {
                setSuccessMsg(res.data.message || `Successfully parsed ${leads.length} leads.`)
            } else {
                setError("No leads with valid names or emails found in this CSV.")
            }
        } catch (err) {
            console.error('Upload failed:', err)
            setError(err.response?.data?.detail || 'Failed to parse CSV file. Ensure it is a valid Apollo export.')
            setPreviewLeads([])
            setSelectedFile(null)
        } finally {
            setIsUploading(false)
        }
    }

    // ── Export CSV ──
    const handleExport = async () => {
        if (filteredLeads.length === 0) return
        setIsExporting(true)
        try {
            const res = await b2bLeadsAPI.exportCSV(filteredLeads)
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `b2b_leads_${Date.now()}.csv`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (err) {
            console.error('Export failed:', err)
            setError('Failed to export leads.')
        } finally {
            setIsExporting(false)
        }
    }

    const handleProceedToEmailGeneration = async () => {
        const companyProfile = {
            name: orgName,
            industry: selectedIndustry,
            description: orgDesc,
            what_do_you_sell: orgDesc,
            who_do_you_sell_to: audienceData?.company_attributes?.industries_include?.join(', ') || '',
            what_are_the_benefits: 'Increased efficiency and revenue',
            website_url: ''
        }
        
        // Ensure leads are saved to the database before generation
        setIsUploading(true) // Reuse loading state for simplicity
        try {
            await b2bLeadsAPI.saveLeads(previewLeads)
        } catch (err) {
            console.error('Failed to save leads:', err)
            setError('Failed to persist leads to database. Please try again.')
            setIsUploading(false)
            return
        }
        
        sessionStorage.setItem('b2b_company_profile', JSON.stringify(companyProfile))
        sessionStorage.setItem('b2b_scored_leads', JSON.stringify(previewLeads))
        sessionStorage.setItem('b2b_audience', JSON.stringify(audienceData))

        setIsUploading(false)
        navigate('/b2b/email-generation')
    }
    
    const handleProceedToEvaluation = () => {
        sessionStorage.setItem('b2b_leads', JSON.stringify(filteredLeads))
        navigate('/b2b/evaluation')
    }

    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setMapPosition({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    })
                },
                () => setError("Failed to get current location. Please allow browser location access.")
            )
        } else {
            setError("Geolocation is not supported by this browser.")
        }
    }

    return (
        <div className="max-w-5xl mx-auto page-enter">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">B2B Lead Generation Wizard</h1>
                <p className="text-sm text-gray-500 mt-1">Define your business, generate an audience, and import your leads.</p>
            </div>

            {/* ── Stepper ── */}
            <div className="mb-10">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-200 -z-10" />
                    <div 
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-sky-500 transition-all duration-300 -z-10" 
                        style={{ width: `${(activeStep / (STEPS.length - 1)) * 100}%` }} 
                    />
                    
                    {STEPS.map((label, idx) => {
                        const isCompleted = idx < activeStep
                        const isActive = idx === activeStep
                        return (
                            <div key={label} className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors duration-300 bg-white
                                    ${isActive ? 'border-sky-500 text-sky-600 shadow-[0_0_0_4px_rgba(14,116,210,0.1)]' 
                                      : isCompleted ? 'border-sky-500 text-sky-600' 
                                      : 'border-gray-300 text-gray-400'}`}>
                                    {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                                </div>
                                <span className={`text-xs mt-2 font-medium transition-colors duration-300 absolute -bottom-6 whitespace-nowrap
                                    ${isActive ? 'text-sky-700' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                                    {label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ── Error Banner ── */}
            {error && (
                <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* ── Success Banner ── */}
            {successMsg && (
                <div className="flex items-center gap-3 p-4 mb-6 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    {successMsg}
                </div>
            )}

            {/* ── Content ── */}
            <div className="card min-h-[400px] mb-6 flex flex-col shadow-sm border-gray-100">
                <div className="flex-1 p-2 md:p-6">
                    {/* STEP 1: Organization Details */}
                    {activeStep === 0 && (
                        <div className="animate-fade-in max-w-2xl mx-auto">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-sky-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Organization Details</h2>
                                    <p className="text-sm text-gray-500">Let's start with the basics.</p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Organization Name</label>
                                    <input 
                                        type="text" 
                                        value={orgName} 
                                        onChange={e => setOrgName(e.target.value)} 
                                        placeholder="e.g. Acme Corp"
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                    <textarea 
                                        value={orgDesc} 
                                        onChange={e => setOrgDesc(e.target.value)} 
                                        placeholder="Tell us what your organization does in detail..."
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all h-32 resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Location */}
                    {activeStep === 1 && (
                        <div className="animate-fade-in max-w-3xl mx-auto">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                                    <MapPin className="w-5 h-5 text-sky-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Location</h2>
                                    <p className="text-sm text-gray-500">Where are you based?</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="md:col-span-2 relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={locationText} 
                                        onChange={e => setLocationText(e.target.value)} 
                                        placeholder="Search for a location or click on the map"
                                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all"
                                    />
                                </div>
                                <button 
                                    onClick={handleUseCurrentLocation}
                                    className="btn btn-outline flex items-center justify-center gap-2 py-3 rounded-xl text-sm"
                                >
                                    <MousePointer2 className="w-4 h-4" />
                                    Current Location
                                </button>
                            </div>

                            <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-inner z-0">
                                {isMounted ? (
                                    <MapContainer 
                                        center={mapPosition || [40.7128, -74.0060]} 
                                        zoom={mapPosition ? 13 : 3} 
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        />
                                        <LocationMarker position={mapPosition} setPosition={setMapPosition} />
                                    </MapContainer>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full bg-gray-50 text-gray-400">
                                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                        <p className="text-sm">Initializing Map...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Industry */}
                    {activeStep === 2 && (
                        <div className="animate-fade-in">
                            <div className="flex items-center gap-3 mb-6 text-center justify-center">
                                <h2 className="text-xl font-bold text-gray-900">What industry do you operate in?</h2>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {INDUSTRIES.map(({ name, icon: Icon }) => {
                                    const isSelected = selectedIndustry === name
                                    return (
                                        <button
                                            key={name}
                                            onClick={() => setSelectedIndustry(name)}
                                            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 hover:-translate-y-1 ${
                                                isSelected 
                                                    ? 'border-sky-500 bg-sky-50 shadow-[0_8px_24px_rgba(14,116,210,0.12)]' 
                                                    : 'border-gray-100 bg-white hover:border-sky-200 hover:shadow-md'
                                            }`}
                                        >
                                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isSelected ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-600'}`}>
                                                <Icon className="w-7 h-7" />
                                            </div>
                                            <span className={`font-semibold ${isSelected ? 'text-sky-700' : 'text-gray-700'}`}>{name}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Team Size */}
                    {activeStep === 3 && (
                        <div className="animate-fade-in max-w-2xl mx-auto">
                            <div className="text-center mb-8">
                                <h2 className="text-xl font-bold text-gray-900">How many people work with you?</h2>
                            </div>
                            
                            <div className="grid gap-3">
                                {TEAM_SIZES.map(size => {
                                    const isSelected = teamSize === size
                                    return (
                                        <button
                                            key={size}
                                            onClick={() => setTeamSize(size)}
                                            className={`w-full px-6 py-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                                                isSelected 
                                                    ? 'border-sky-500 bg-sky-50 text-sky-700 font-semibold' 
                                                    : 'border-gray-100 bg-white hover:border-sky-200 text-gray-700'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-sky-500' : 'border-gray-300'}`}>
                                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />}
                                            </div>
                                            {size}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 5: Target Audience Strategy */}
                    {activeStep === 4 && (
                        <div className="animate-fade-in">
                            {!audienceStrategy && !isGenerating && (
                                <>
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-bold text-gray-900">Target Audience Strategy</h2>
                                        <p className="text-gray-500 mt-2">How would you like to define your target audience?</p>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                                        {/* Auto Generate Card */}
                                        <div 
                                            onClick={handleGenerateAudience}
                                            className="p-8 rounded-3xl border-2 border-gray-100 hover:border-indigo-400 bg-white hover:shadow-[0_8px_32px_rgba(99,102,241,0.15)] transition-all cursor-pointer text-center group"
                                        >
                                            <div className="w-20 h-20 mx-auto bg-indigo-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                <Wand2 className="w-10 h-10 text-indigo-600" />
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-3">Auto-Generate (AI)</h3>
                                            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                                Our AI will analyze your organization profile, industry, and team size to intelligently build your ideal target demographics.
                                            </p>
                                            <button className="btn bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6">
                                                Generate Audience
                                            </button>
                                        </div>

                                        {/* Manual Form Card */}
                                        <div 
                                            onClick={() => setAudienceStrategy('manual_form')}
                                            className="p-8 rounded-3xl border-2 border-gray-100 hover:border-sky-400 bg-white hover:shadow-[0_8px_32px_rgba(14,116,210,0.15)] transition-all cursor-pointer text-center group"
                                        >
                                            <div className="w-20 h-20 mx-auto bg-sky-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                <Target className="w-10 h-10 text-sky-600" />
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-3">Customize Manually</h3>
                                            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                                I know exactly who I want to target. Let me manually specify the industries, seniorities, and locations.
                                            </p>
                                            <button className="btn btn-outline border-sky-200 text-sky-700 hover:bg-sky-50 rounded-full px-6">
                                                Enter Manual Criteria
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {isGenerating && (
                                <div className="py-20 text-center animate-fade-in">
                                    <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-6" />
                                    <h3 className="text-2xl font-bold text-gray-900">AI is analyzing your profile...</h3>
                                    <p className="text-gray-500 mt-2">This takes just a moment to generate the perfect audience filters.</p>
                                </div>
                            )}

                            {audienceStrategy === 'manual_form' && (
                                <div className="max-w-3xl mx-auto animate-fade-in">
                                    <h3 className="text-xl font-bold text-sky-900 mb-2">Manual Audience Criteria</h3>
                                    <p className="text-sm text-gray-500 mb-6">Enter comma-separated values for your target filters.</p>
                                    
                                    <div className="grid md:grid-cols-2 gap-5 mb-8">
                                        <InputField label="Target Industries" value={manualIndustries} onChange={setManualIndustries} placeholder="e.g. Software, Finance" />
                                        <InputField label="Target Company Sizes" value={manualSizes} onChange={setManualSizes} placeholder="e.g. 51-200, 201-500" />
                                        <InputField label="Target Seniorities" value={manualSeniority} onChange={setManualSeniority} placeholder="e.g. C-Suite, VP, Director" />
                                        <InputField label="Target Job Functions" value={manualFunctions} onChange={setManualFunctions} placeholder="e.g. Engineering, IT" />
                                        <div className="md:col-span-2">
                                            <InputField label="Target Locations" value={manualLocations} onChange={setManualLocations} placeholder="e.g. United States, Canada" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button className="btn btn-outline" onClick={() => setAudienceStrategy('')}>Cancel</button>
                                        <button className="btn btn-b2b" onClick={handleManualConfirm}>Confirm Criteria</button>
                                    </div>
                                </div>
                            )}

                            {(audienceStrategy === 'ai' || audienceStrategy === 'manual') && audienceData && (
                                <div className="animate-fade-in max-w-4xl mx-auto">
                                    <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                                <CheckCircle2 className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-lg font-bold text-emerald-800">Audience Criteria Ready!</h3>
                                        </div>
                                        <button className="btn btn-outline text-xs px-3 py-1.5" onClick={() => { setAudienceStrategy(''); setAudienceData(null) }}>
                                            Start Over
                                        </button>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="card border-2 border-gray-100 hover:border-sky-200 transition-colors">
                                            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
                                                <Target className="w-6 h-6 text-sky-600" />
                                                <h4 className="text-lg font-bold text-gray-900">Company Attributes</h4>
                                            </div>
                                            
                                            <div className="mb-4">
                                                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Industries</h5>
                                                <div className="flex flex-wrap gap-2">
                                                    {audienceData.company_attributes?.industries_include?.length > 0 
                                                        ? audienceData.company_attributes.industries_include.map((i, idx) => <span key={idx} className="tag bg-sky-50 text-sky-700 border border-sky-100">{i}</span>)
                                                        : <span className="text-sm text-gray-400">None specified</span>}
                                                </div>
                                            </div>

                                            <div>
                                                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Company Sizes</h5>
                                                <div className="flex flex-wrap gap-2">
                                                    {audienceData.company_attributes?.company_sizes?.length > 0 
                                                        ? audienceData.company_attributes.company_sizes.map((i, idx) => <span key={idx} className="tag">{i}</span>)
                                                        : <span className="text-sm text-gray-400">None specified</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="card border-2 border-gray-100 hover:border-indigo-200 transition-colors">
                                            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
                                                <Briefcase className="w-6 h-6 text-indigo-600" />
                                                <h4 className="text-lg font-bold text-gray-900">Job Title Attributes</h4>
                                            </div>
                                            
                                            <div className="mb-4">
                                                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Seniority</h5>
                                                <div className="flex flex-wrap gap-2">
                                                    {audienceData.job_title_attributes?.seniority?.length > 0 
                                                        ? audienceData.job_title_attributes.seniority.map((i, idx) => <span key={idx} className="tag bg-indigo-50 text-indigo-700 border border-indigo-100">{i}</span>)
                                                        : <span className="text-sm text-gray-400">None specified</span>}
                                                </div>
                                            </div>

                                            <div>
                                                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Job Functions</h5>
                                                <div className="flex flex-wrap gap-2">
                                                    {audienceData.job_title_attributes?.job_functions?.length > 0 
                                                        ? audienceData.job_title_attributes.job_functions.map((i, idx) => <span key={idx} className="tag">{i}</span>)
                                                        : <span className="text-sm text-gray-400">None specified</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 6: Upload CSV */}
                    {activeStep === 5 && (
                        <div className="animate-fade-in">
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Upload Leads CSV</h2>
                                <p className="text-gray-500 mt-2">Use your generated filters to export a CSV from your data provider (e.g. Apollo), then upload it below.</p>
                            </div>

                            {!selectedFile ? (
                                <div className="max-w-2xl mx-auto">
                                    <div 
                                        className="border-2 border-dashed border-sky-300 bg-sky-50/50 hover:bg-sky-50 rounded-3xl p-12 text-center cursor-pointer transition-colors"
                                        onClick={() => document.getElementById('b2b-csv-upload').click()}
                                    >
                                        <div className="w-16 h-16 mx-auto bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mb-4">
                                            {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <UploadCloud className="w-8 h-8" />}
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">{isUploading ? 'Processing...' : 'Click to Upload CSV'}</h3>
                                        <p className="text-sm text-gray-500">Max file size: 10MB</p>
                                        <input type="file" id="b2b-csv-upload" className="hidden" accept=".csv" onChange={handleFileUpload} />
                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-2xl mx-auto">
                                    <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                                            {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900">{isUploading ? 'Uploading...' : 'File Uploaded Successfully'}</h4>
                                            <p className="text-sm text-emerald-700">{selectedFile.name} • {(selectedFile.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        {!isUploading && (
                                            <button 
                                                className="text-xs font-medium text-gray-500 hover:text-red-600 underline"
                                                onClick={() => { setSelectedFile(null); setPreviewLeads([]); setSuccessMsg(null); }}
                                            >
                                                Change File
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedFile && previewLeads.length > 0 && (
                                <div className="mt-4">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-xl font-bold text-gray-900">{filteredLeads.length} Leads Parsed</h3>
                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wider border border-emerald-200">
                                                    Saved to Session
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {filteredLeads.length !== previewLeads.length && <span>Showing {filteredLeads.length} of </span>}
                                                {previewLeads.length} total from {selectedFile.name}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                className="btn btn-outline text-xs px-3 py-2 flex items-center gap-2" 
                                                onClick={handleExport}
                                                disabled={isExporting}
                                            >
                                                {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                                Export CSV
                                            </button>
                                        </div>
                                    </div>

                                    {/* Preview Section Header */}
                                    <div className="flex items-center gap-3 mb-4 mt-8">
                                        <div className="h-px flex-1 bg-gray-100"></div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Data Preview</span>
                                        <div className="h-px flex-1 bg-gray-100"></div>
                                    </div>

                                    {/* Availability Filters */}
                                    <div className="flex items-center gap-2 mb-6 flex-wrap">
                                        <button 
                                            onClick={() => toggleMustHave('email')}
                                            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-full text-xs font-medium transition-all ${
                                                mustHave.email 
                                                    ? 'bg-sky-500 text-white border-sky-500 shadow-sm' 
                                                    : 'bg-white text-sky-700 border-sky-200 hover:bg-sky-50'
                                            }`}
                                        >
                                            <Mail className="w-3.5 h-3.5" />
                                            {previewLeads.filter(l => l.email && l.email !== 'Not Found').length} Emails
                                        </button>
                                        <button 
                                            onClick={() => toggleMustHave('linkedin')}
                                            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-full text-xs font-medium transition-all ${
                                                mustHave.linkedin 
                                                    ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' 
                                                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                                            }`}
                                        >
                                            <Linkedin className="w-3.5 h-3.5" />
                                            {previewLeads.filter(l => l.linkedin).length} LinkedIn
                                        </button>
                                        <button 
                                            onClick={() => toggleMustHave('website')}
                                            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-full text-xs font-medium transition-all ${
                                                mustHave.website 
                                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' 
                                                    : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                                            }`}
                                        >
                                            <Globe className="w-3.5 h-3.5" />
                                            {previewLeads.filter(l => l.website).length} Website
                                        </button>
                                    </div>

                                    <div className="card p-0 overflow-x-auto border-gray-200 shadow-none">
                                        <table className="data-table text-xs">
                                            <thead>
                                                <tr>
                                                    <th className="rounded-tl-xl">First Name</th>
                                                    <th>Last Name</th>
                                                    <th>Full Name</th>
                                                    <th>Job Title</th>
                                                    <th>Company Name</th>
                                                    <th>Company Domain</th>
                                                    <th>LinkedIn Profile</th>
                                                    <th className="rounded-tr-xl">Work Email</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredLeads.slice(0, 50).map((row, idx) => (
                                                    <tr key={row.id || idx} className="hover:bg-gray-50 transition-colors">
                                                        <td>{row.first_name || '—'}</td>
                                                        <td>{row.last_name || '—'}</td>
                                                        <td className="font-semibold text-gray-900">{row.name || '—'}</td>
                                                        <td>{row.title || '—'}</td>
                                                        <td>{row.company || '—'}</td>
                                                        <td className="text-sky-600">
                                                            {row.website ? (
                                                                <a href={row.website.startsWith('http') ? row.website : `https://${row.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                                    {row.website.replace(/^https?:\/\/(www\.)?/, '')}
                                                                </a>
                                                            ) : '—'}
                                                        </td>
                                                        <td>
                                                            {row.linkedin ? (
                                                                <a href={row.linkedin.startsWith('http') ? row.linkedin : `https://${row.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate max-w-[200px] block">
                                                                    {row.linkedin.replace(/^https?:\/\/(www\.)?/, '')}
                                                                </a>
                                                            ) : '—'}
                                                        </td>
                                                        <td className="font-medium text-sky-700">{row.email || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {previewLeads.length > 50 && (
                                            <div className="p-4 text-center bg-gray-50 border-t border-gray-100 text-sm text-gray-500">
                                                Showing {Math.min(50, filteredLeads.length)} of {filteredLeads.length} leads
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* ── Footer Actions ── */}
                <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-b-xl">
                    <button 
                        className={`btn btn-outline ${activeStep === 0 ? 'invisible' : ''}`}
                        onClick={handleBack}
                    >
                        Back
                    </button>
                    
                    {activeStep < STEPS.length - 1 ? (
                        <button 
                            className="btn btn-b2b"
                            onClick={handleNext}
                            disabled={isNextDisabled()}
                        >
                            Next Step
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button className="btn btn-outline shadow-sm" onClick={handleProceedToEvaluation} disabled={isNextDisabled()}>
                                <Target className="w-4 h-4" />
                                Move to Evaluation
                            </button>
                            <button className="btn btn-b2b shadow-md" onClick={handleProceedToEmailGeneration} disabled={isNextDisabled()}>
                                <Wand2 className="w-4 h-4" />
                                Proceed to Email Gen
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function InputField({ label, value, onChange, placeholder }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
            <input 
                type="text" 
                value={value} 
                onChange={e => onChange(e.target.value)} 
                placeholder={placeholder}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all"
            />
        </div>
    )
}
