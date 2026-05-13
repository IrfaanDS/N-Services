import stripe
import os
import sys

def get_stripe_key():
    # Try to read from multiple possible .env locations
    env_paths = [r'c:\Univeristy\FYP-3\.env', r'c:\Univeristy\FYP-3\N-Services\.env']
    for path in env_paths:
        if os.path.exists(path):
            with open(path, 'r') as f:
                for line in f:
                    if line.startswith('STRIPE_SECRET_KEY='):
                        return line.split('=', 1)[1].strip()
    return None

def setup_stripe_products():
    stripe_key = get_stripe_key()
    if not stripe_key:
        print("Could not find STRIPE_SECRET_KEY in .env files.")
        sys.exit(1)

    stripe.api_key = stripe_key
    print("Connected to Stripe! Creating products and prices...")

    tiers = [
        {"name": "N-Services Basic", "description": "Self-service platform access for outreach tasks.", "price": 2900},
        {"name": "N-Services Pro", "description": "Access to the platform plus dedicated agents for assistance.", "price": 9900},
        {"name": "N-Services Premium", "description": "Full pipeline automation where agents handle end-to-end execution.", "price": 29900}
    ]

    results = {}
    try:
        for tier in tiers:
            print(f"Creating product: {tier['name']}...")
            product = stripe.Product.create(name=tier["name"], description=tier["description"])
            print(f"Creating price for {tier['name']}...")
            price = stripe.Price.create(product=product.id, unit_amount=tier["price"], currency="usd", recurring={"interval": "month"})
            env_key = f"STRIPE_PRICE_{tier['name'].split()[-1].upper()}"
            results[env_key] = price.id
            print(f"Created {tier['name']} -> Price ID: {price.id}")

        print("\nSUCCESS_VARS")
        for key, val in results.items():
            print(f"{key}={val}")

    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    setup_stripe_products()
