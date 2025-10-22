const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const apiKey = process.env.TICKETTAILOR_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Ticket Tailor API not configured' })
    };
  }

  try {
    console.log('Fetching Ticket Tailor events...');

    // Get all events
    const eventsResponse = await axios.get('https://api.tickettailor.com/v1/events', {
      auth: { username: apiKey, password: '' },
      headers: { 'Accept': 'application/json' }
    });

    const events = eventsResponse.data.data || [];
    console.log(`Found ${events.length} total events`);

    // Filter for published events
    const publishedEvents = events.filter(event => event.status === 'published');
    console.log(`Found ${publishedEvents.length} published events`);

    // For each event, get ALL orders and count issued tickets
    const enrichedEvents = await Promise.all(
      publishedEvents.map(async (event) => {
        try {
          console.log(`Fetching orders for event: ${event.id} - ${event.name}`);
          
          // Get all orders for this event
          let allOrders = [];
          let hasMore = true;
          let startingAfter = null;
          
          // Paginate through all orders for this event
          while (hasMore) {
            const ordersParams = {
              limit: 100,
              event_id: event.id
            };
            
            if (startingAfter) {
              ordersParams.starting_after = startingAfter;
            }
            
            const ordersResponse = await axios.get('https://api.tickettailor.com/v1/orders', {
              auth: { username: apiKey, password: '' },
              headers: { 'Accept': 'application/json' },
              params: ordersParams
            });
            
            const orders = ordersResponse.data.data || [];
            allOrders = allOrders.concat(orders);
            
            // Check if there are more pages
            if (orders.length < 100) {
              hasMore = false;
            } else {
              // Use the last order ID for pagination
              startingAfter = orders[orders.length - 1].id;
            }
          }
          
          console.log(`Found ${allOrders.length} orders for event ${event.id}`);
          
          // Count total issued tickets across all orders
          let totalIssuedTickets = 0;
          
          allOrders.forEach(order => {
            // Each order has an issued_tickets array
            if (order.issued_tickets && Array.isArray(order.issued_tickets)) {
              totalIssuedTickets += order.issued_tickets.length;
            }
          });
          
          console.log(`Event ${event.id} has ${totalIssuedTickets} issued tickets`);
          
          return {
            id: event.id,
            name: event.name,
            description: event.description,
            start: event.start ? event.start.iso : null,
            end: event.end ? event.end.iso : null,
            status: event.status,
            venue: event.venue?.name || 'Online',
            location: event.venue?.postal_code || null,
            ticketsIssued: totalIssuedTickets,
            ticketsRemaining: null, // We can calculate this if we have total capacity
            url: event.url
          };
          
        } catch (err) {
          console.error(`Error fetching data for event ${event.id}:`, err.message);
          return {
            id: event.id,
            name: event.name,
            start: event.start ? event.start.iso : null,
            status: event.status,
            ticketsIssued: 0,
            ticketsRemaining: null,
            error: err.message
          };
        }
      })
    );

    // Sort by start date
    const sortedEvents = enrichedEvents.sort((a, b) => {
      if (!a.start) return 1;
      if (!b.start) return -1;
      return new Date(a.start) - new Date(b.start);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        events: sortedEvents,
        totalEvents: sortedEvents.length,
        totalTicketsIssued: sortedEvents.reduce((sum, e) => sum + (e.ticketsIssued || 0), 0)
      })
    };

  } catch (error) {
    console.error('Ticket Tailor API Error:', error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: error.response?.data?.message || error.message || 'Failed to fetch Ticket Tailor data'
      })
    };
  }
};
