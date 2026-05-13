import { Check } from 'lucide-react'

const tiers = [
    {
        id: 'basic',
        name: 'Basic',
        description: 'Self-service platform access for outreach tasks.',
        price: 0,
        features: [
            'Full platform access',
            'Lead acquisition & evaluation',
            'AI email generation',
            'Email sending tools',
            'Standard support'
        ]
    },
    {
        id: 'pro',
        name: 'Pro',
        description: 'Access to the platform plus dedicated agents for assistance.',
        price: 20,
        isPopular: true,
        features: [
            'Everything in Basic',
            'Dedicated AI agents',
            'Priority support',
            'Advanced analytics',
            'Custom AI personas'
        ]
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Full pipeline automation where agents handle end-to-end execution.',
        price: 50,
        features: [
            'Everything in Pro',
            'End-to-end execution',
            'Done-for-you campaigns',
            'White-glove onboarding',
            'Weekly strategy calls'
        ]
    }
]

export default function PricingCards({ onSelect }) {
    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose your plan</h2>
                <p className="text-gray-500 max-w-xl mx-auto">
                    Select the tier that best fits your needs. You can upgrade or downgrade at any time.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {tiers.map((tier) => (
                    <div 
                        key={tier.id}
                        className={`relative rounded-2xl bg-white border p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                            tier.isPopular ? 'border-primary-500 shadow-lg shadow-primary-500/10' : 'border-gray-200'
                        }`}
                    >
                        {tier.isPopular && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-primary-500 text-white text-xs font-bold uppercase tracking-wider rounded-full">
                                Most Popular
                            </div>
                        )}
                        
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
                            <p className="text-sm text-gray-500 mt-2 h-10">{tier.description}</p>
                        </div>
                        
                        <div className="mb-6 flex items-baseline gap-1">
                            <span className="lp-display-xl lp-text-gradient lp-tnum font-bold">${tier.price}</span>
                            <span className="lp-body-md lp-text-ink-mute ml-1">/month</span>
                        </div>
                        
                        <ul className="space-y-3 mb-8 flex-1">
                            {tier.features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="mt-1 h-1.5 w-1.5 rounded-full lp-bg-primary shrink-0" />
                                    <span className="lp-body-md lp-text-ink-secondary">{feature}</span>
                                </li>
                            ))}
                        </ul>
                        
                        <button
                            onClick={() => onSelect(tier.id)}
                            className={`lp-btn-pill w-full h-11 justify-center ${
                                tier.isPopular 
                                    ? 'lp-btn-primary' 
                                    : 'lp-btn-secondary'
                            }`}
                        >
                            Get Started
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
