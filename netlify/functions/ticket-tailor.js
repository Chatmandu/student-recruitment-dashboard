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

  const apiKey = process.env.TICKET_TAILOR_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Ticket Tailor not configured' })
    };
  }

  const baseUrl = 'https://api.tickettailor.com/v1';

  try {
    const { action } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'getEvents':
        // Get all events
        const eventsRes = await axios.get(`${baseUrl}/events`, {
          headers: { 'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}` },
          params: { 
            status: 'published',
            limit: 100
          }
        });

        // Get ticket types for each event
        const eventDetailsPromises = eventsRes.data.data.map(async (event) => {
          try {
            const ticketTypesRes = await axios.get(`${baseUrl}/event_series/${event.event_series_id}/ticket_types`, {
              headers: { 'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}` }
            });

            const issuedRes = await axios.get(`${baseUrl}/issued_tickets`, {
              headers: { 'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}` },
              params: { 
                event_id: event.id,
                limit: 1000
              }
            });

            const ticketTypes = ticketTypesRes.data.data || [];
            const issuedTickets = issuedRes.data.data || [];

            // Calculate capacity and sold
            let totalCapacity = 0;
            let totalSold = 0;

            ticketTypes.forEach(type => {
              totalCapacity += type.quantity || 0;
            });

            // Count issued tickets by status
            const validTickets = issuedTickets.filter(t => 
              t.status === 'valid' || t.status === 'checked_in'
            );
            totalSold = validTickets.length;

            // Count checked in (attendees)
            const checkedIn = issuedTickets.filter(t => t.status === 'checked_in').length;

            return {
              id: event.id,
              name: event.name,
              description: event.description,
              start: event.start.date,
              end: event.end.date,
              venue: event.venue?.name || 'Online',
              url: event.url,
              status: event.status,
              capacity: totalCapacity,
              sold: totalSold,
              available: Math.max(0, totalCapacity - totalSold),
              percentageSold: totalCapacity > 0 ? ((totalSold / totalCapacity) * 100).toFixed(2) : 0,
              checkedIn,
              noShows: totalSold - checkedIn,
              ticketTypes: ticketTypes.map(tt => ({
                id: tt.id,
                name: tt.name,
                price: tt.price,
                quantity: tt.quantity
              }))
            };
          } catch (err) {
            console.error(`Error fetching details for event ${event.id}:`, err.message);
            return {
              id: event.id,
              name: event.name,
              start: event.start.date,
              error: 'Could not fetch details'
            };
          }
        });

        const enrichedEvents = await Promise.all(eventDetailsPromises);

        // Sort by start date (upcoming first)
        const sortedEvents = enrichedEvents
          .filter(e => !e.error)
          .sort((a, b) => new Date(a.start) - new Date(b.start));

        // Calculate summary stats
        const totalEvents = sortedEvents.length;
        const totalCapacity = sortedEvents.reduce((sum, e) => sum + (e.capacity || 0), 0);
        const totalSold = sortedEvents.reduce((sum, e) => sum + (e.sold || 0), 0);
        const totalCheckedIn = sortedEvents.reduce((sum, e) => sum + (e.checkedIn || 0), 0);
        const totalNoShows = sortedEvents.reduce((sum, e) => sum + (e.noShows || 0), 0);

        // Upcoming events (future dates)
        const now = new Date();
        const upcomingEvents = sortedEvents.filter(e => new Date(e.start) > now);
        const pastEvents = sortedEvents.filter(e => new Date(e.start) <= now);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            events: sortedEvents,
            upcomingEvents,
            pastEvents,
            summary: {
              totalEvents,
              upcomingCount: upcomingEvents.length,
              pastCount: pastEvents.length,
              totalCapacity,
              totalSold,
              totalAvailable: totalCapacity - totalSold,
              overallCapacityUtilization: totalCapacity > 0 ? ((totalSold / totalCapacity) * 100).toFixed(2) : 0,
              totalCheckedIn,
              totalNoShows,
              attendanceRate: totalSold > 0 ? ((totalCheckedIn / totalSold) * 100).toFixed(2) : 0
            },
            lastUpdated: new Date().toISOString()
          })
        };

      case 'getEventById':
        const { eventId } = JSON.parse(event.body || '{}');
        
        if (!eventId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'eventId required' })
          };
        }

        const eventRes = await axios.get(`${baseUrl}/events/${eventId}`, {
          headers: { 'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}` }
        });

        const issuedRes = await axios.get(`${baseUrl}/issued_tickets`, {
          headers: { 'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}` },
          params: { 
            event_id: eventId,
            limit: 1000
          }
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            event: eventRes.data,
            tickets: issuedRes.data.data
          })
        };

      case 'getSalesVelocity':
        // Get recent events and track their sales over time
        const salesEventsRes = await axios.get(`${baseUrl}/events`, {
          headers: { 'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}` },
          params: { limit: 10 }
        });

        const velocityData = await Promise.all(
          salesEventsRes.data.data.slice(0, 5).map(async (evt) => {
            try {
              const tickets = await axios.get(`${baseUrl}/issued_tickets`, {
                headers: { 'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}` },
                params: { event_id: evt.id, limit: 1000 }
              });

              // Group tickets by date
              const ticketsByDate = {};
              tickets.data.data.forEach(ticket => {
                const date = ticket.created_at.split('T')[0];
                ticketsByDate[date] = (ticketsByDate[date] || 0) + 1;
              });

              return {
                eventId: evt.id,
                eventName: evt.name,
                dailySales: Object.entries(ticketsByDate).map(([date, count]) => ({
                  date,
                  count
                }))
              };
            } catch (err) {
              return null;
            }
          })
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            salesVelocity: velocityData.filter(v => v)
          })
        };

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }

  } catch (error) {
    console.error('Ticket Tailor API Error:', error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: error.response?.data?.error || error.message || 'Failed to fetch Ticket Tailor data'
      })
    };
  }
};
