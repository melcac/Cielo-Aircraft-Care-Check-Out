const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { services, is_membership, membership_amount, aircraft, customer_email, success_url, cancel_url, metadata } = req.body;

    if (is_membership) {
      const product = await stripe.products.create({ name: 'Cielo Circle — ' + (aircraft || 'Aircraft Care'), description: '1 full detail + 2 trip cleans monthly for ' + (aircraft || 'your aircraft') });
      const price = await stripe.prices.create({ product: product.id, unit_amount: Math.round(membership_amount * 100), currency: 'usd', recurring: { interval: 'month' } });
      const session = await stripe.checkout.sessions.create({ mode: 'subscription', payment_method_types: ['card'], customer_email: customer_email || undefined, line_items: [{ price: price.id, quantity: 1 }], success_url: success_url || 'https://www.cieloaircraftcare.com', cancel_url: cancel_url || 'https://www.cieloaircraftcare.com', metadata: metadata || {} });
      res.status(200).json({ url: session.url });
    } else {
      const line_items = (services || []).map(function(s) { return { price_data: { currency: 'usd', product_data: { name: s.name }, unit_amount: Math.round(s.price * 100) }, quantity: 1 }; });
      if (line_items.length === 0) { res.status(400).json({ error: 'No services selected' }); return; }
      const session = await stripe.checkout.sessions.create({ mode: 'payment', payment_method_types: ['card'], customer_email: customer_email || undefined, line_items: line_items, success_url: success_url || 'https://www.cieloaircraftcare.com', cancel_url: cancel_url || 'https://www.cieloaircraftcare.com', metadata: metadata || {} });
      res.status(200).json({ url: session.url });
    }
  } catch (err) { console.error('Stripe error:', err.message); res.status(500).json({ error: err.message }); }
};
