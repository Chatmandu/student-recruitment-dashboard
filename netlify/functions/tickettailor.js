const https = require('https');

const apiKey = process.env.TICKET_TAILOR_API_KEY;
const baseUrl = 'api.tickettailor.com';

// Helper function to make authenticated GET requests to Ticket Tailor API
function ticketTailorFetch(path, params = {}) {
    return new Promise((resolve, reject) => {
        const queryString = Object.keys(params).length > 0 
            ? '?' + Object.entries(params).map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join('&')
            : '';
        
        const options = {
            hostname: baseUrl,
            path: `/v1${path}${queryString}`,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(apiKey + ':').toString('base64')
            }
        };

        https.get(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ 
                        ok: res.statusCode === 200, 
                        data: parsed, 
                        status: res.statusCode 
                    });
                } catch (e) {
                    reject(new Error('Failed to parse response'));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (!apiKey) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Ticket Tailor API key not configured' })
        };
    }

    try {
        const { action, startDate, endDate } = JSON.parse(event.body || '{}');

        switch (action) {
            case 'getEvents':
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const eventsResult = await ticketTailorFetch('/events', {
                    status: 'published',
                    start: startDate || today.toISOString(),
                    limit: 100
                });

                if (!eventsResult.ok) {
                    throw new Error('Failed to fetch events');
                }

                let events = eventsResult.data.data || [];
                
                console.log(`Fetched ${events.length} events from Ticket Tailor`);
                
                // Fetch ticket data for each event via ORDERS
                // To avoid timeout, we'll limit processing and use simpler logic
                const eventsWithTickets = await Promise.all(
                    events.slice(0, 20).map(async (evt) => {
                        try {
                            // Get first page of orders for this event (limit to avoid timeout)
                            const ordersResult = await ticketTailorFetch('/orders', {
                                limit: 100,
                                event_id: evt.id
                            });
                            
                            if (!ordersResult.ok) {
                                console.error(`Failed to fetch orders for event ${evt.id}`);
                                return {
                                    id: evt.id,
                                    name: evt.name,
                                    start: evt.start?.date || evt.start,
                                    venue: evt.venue?.name || 'TBA',
                                    capacity: evt.total_tickets || 0,
                                    sold: 0,
                                    available: evt.total_tickets || 0,
                                    url: evt.url,
                                    status: evt.status
                                };
                            }
                            
                            const orders = ordersResult.data.data || [];
                            
                            // Count issued tickets from orders
                            let totalIssued = 0;
                            orders.forEach(order => {
                                if (order.issued_tickets && Array.isArray(order.issued_tickets)) {
                                    totalIssued += order.issued_tickets.length;
                                }
                            });
                            
                            console.log(`Event ${evt.name}: ${totalIssued} tickets from ${orders.length} orders`);
                            
                            return {
                                id: evt.id,
                                name: evt.name,
                                start: evt.start?.date || evt.start,
                                venue: evt.venue?.name || 'TBA',
                                capacity: evt.total_tickets || 0,
                                sold: totalIssued,
                                available: Math.max(0, (evt.total_tickets || 0) - totalIssued),
                                url: evt.url,
                                status: evt.status
                            };
                        } catch (error) {
                            console.error(`Error processing event ${evt.id}:`, error.message);
                            
                            return {
                                id: evt.id,
                                name: evt.name,
                                start: evt.start?.date || evt.start,
                                venue: evt.venue?.name || 'TBA',
                                capacity: evt.total_tickets || 0,
                                sold: 0,
                                available: evt.total_tickets || 0,
                                url: evt.url,
                                status: evt.status
                            };
                        }
                    })
                );

                const validEvents = eventsWithTickets;
                const totalSold = validEvents.reduce((sum, evt) => sum + evt.sold, 0);

                console.log(`Returning ${validEvents.length} events with ${totalSold} total tickets sold`);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        upcomingEvents: validEvents,
                        summary: {
                            totalSold: totalSold,
                            totalEvents: validEvents.length
                        },
                        timestamp: new Date().toISOString()
                    })
                };

            case 'getEventDetails':
                const { eventId } = JSON.parse(event.body || '{}');
                
                if (!eventId) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Event ID is required' })
                    };
                }

                const eventResult = await ticketTailorFetch(`/events/${eventId}`);
                
                if (!eventResult.ok) {
                    return {
                        statusCode: eventResult.status,
                        headers,
                        body: JSON.stringify({ 
                            error: 'Event not found',
                            message: `Event ${eventId} may have been deleted or is no longer accessible`
                        })
                    };
                }

                const ordersResult = await ticketTailorFetch('/orders', {
                    event_id: eventId,
                    limit: 100
                });

                const eventData = eventResult.data;
                const orders = ordersResult.ok ? (ordersResult.data.data || []) : [];
                
                // Extract all issued tickets from orders
                let allTickets = [];
                orders.forEach(order => {
                    if (order.issued_tickets && Array.isArray(order.issued_tickets)) {
                        allTickets = allTickets.concat(order.issued_tickets);
                    }
                });

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        event: {
                            ...eventData,
                            ticketsIssued: allTickets.length,
                            tickets: allTickets
                        }
                    })
                };

            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Invalid action',
                        validActions: ['getEvents', 'getEventDetails']
                    })
                };
        }

    } catch (error) {
        console.error('Ticket Tailor API Error:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Failed to fetch Ticket Tailor data'
            })
        };
    }
};
