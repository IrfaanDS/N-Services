import { useNavigate, Link } from 'react-router-dom'
import PricingCards from '../components/pricing/PricingCards'
import nServicesLogo from '../assets/n-services-logo.png'

export default function Pricing() {
    const navigate = useNavigate()

    const handleTierSelect = (tierId) => {
        navigate(`/signup?plan=${tierId}`)
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 py-12">
            <div className="w-full max-w-5xl page-enter">
                
                {/* ── Logo ── */}
                <Link to="/welcome" className="flex items-center justify-center gap-3 mb-12">
                    <img src={nServicesLogo} alt="N-Services" className="h-10 w-auto" />
                    <span className="text-2xl font-bold text-gray-900">N-Services</span>
                </Link>

                <PricingCards onSelect={handleTierSelect} />
            </div>
        </div>
    )
}
