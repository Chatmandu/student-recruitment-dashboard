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
      body: JSON.stringify({ error: 'Ticket Tailor API key not configured' })
    };
  }

  const baseUrl = 'https://api.tickettailor.com/v1';

  try {
    const { action, startDate, endDate } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'getEvents':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const eventsResponse = await axios.get(`${baseUrl}/events`, {
          headers: { 
            'Authorization': `Bearer ${apiKey}`
          },
          params: { 
            status: 'published',
            start: startDate || today.toISOString(),
            limit: 100
          }
        });

        let events = eventsResponse.data.data || [];
        
        const now = Date.now();
        events = events.filter(evt => {
          if (!evt.start) return true;
          const eventDate = new Date(evt.start.date || evt.start).getTime();
          return eventDate >= now - (7 * 24 * 60 * 60 * 1000);
        });

        const eventsWithTickets = await Promise.all(
          events.map(async (event) => {
            try {
              const ticketsResponse = await axios.get(
                `${baseUrl}/events/${event.id}/issued_tickets`,
                {
                  headers: { 'Authorization': `Bearer ${apiKey}` },
                  params: { limit: 1000 }
                }
              );

              const tickets = ticketsResponse.data.data || [];
              const totalIssued = tickets.length;
              
              const ticketsByType = tickets.reduce((acc, ticket) => {
                const typeName = ticket.ticket_type?.name || 'Unknown';
                acc[typeName] = (acc[typeName] || 0) + 1;
                return acc;
              }, {});

              return {
                eventId: event.id,
                eventName: event.name,
                eventDate: event.start?.date || event.start,
                eventUrl: event.url,
                totalTicketsReleased: event.total_tickets || 0,
                totalTicketsIssued: totalIssued,
                ticketsAvailable: (event.total_tickets || 0) - totalIssued,
                ticketsByType,
                status: event.status,
                venue: event.venue?.name || 'TBA'
              };
            } catch (error) {
              if (error.response?.status === 404) {
                console.warn(`Event ${event.id} returned 404 - skipping`);
                return null;
              }
              
              console.error(`Error fetching tickets for event ${event.id}:`, error.message);
              return {
                eventId: event.id,
                eventName: event.name,
                eventDate: event.start?.date || event.start,
                eventUrl: event.url,
                totalTicketsReleased: event.total_tickets || 0,
                totalTicketsIssued: 0,
                ticketsAvailable: event.total_tickets || 0,
                ticketsByType: {},
                status: event.status,
                venue: event.venue?.name || 'TBA',
                error: 'Could not fetch ticket details'
              };
            }
          })
        );

        const validEvents = eventsWithTickets.filter(e => e !== null);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            events: validEvents,
            totalEvents: validEvents.length,
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

        try {
          const eventResponse = await axios.get(`${baseUrl}/events/${eventId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });

          const ticketsResponse = await axios.get(
            `${baseUrl}/events/${eventId}/issued_tickets`,
            {
              headers: { 'Authorization': `Bearer ${apiKey}` },
              params: { limit: 1000 }
            }
          );

          const eventData = eventResponse.data;
          const tickets = ticketsResponse.data.data || [];

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              event: {
                ...eventData,
                ticketsIssued: tickets.length,
                tickets: tickets
              }
            })
          };
        } catch (error) {
          if (error.response?.status === 404) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ 
                error: 'Event not found',
                message: `Event ${eventId} may have been deleted or is no longer accessible`
              })
            };
          }
          throw error;
        }

      case 'getSalesVelocity':
        const salesEventsResponse = await axios.get(`${baseUrl}/events`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          params: { 
            status: 'published',
            limit: 100
          }
        });

        const salesEvents = salesEventsResponse.data.data || [];

        const velocityData = await Promise.all(
          salesEvents.map(async (evt) => {
            try {
              const ticketsResponse = await axios.get(
                `${baseUrl}/events/${evt.id}/issued_tickets`,
                {
                  headers: { 'Authorization': `Bearer ${apiKey}` },
                  params: { limit: 1000 }
                }
              );

              const tickets = ticketsResponse.data.data || [];

              const ticketsByDate = tickets.reduce((acc, ticket) => {
                const date = ticket.created_at.split('T')[0];
                acc[date] = (acc[date] || 0) + 1;
                return acc;
              }, {});

              return {
                eventId: evt.id,
                eventName: evt.name,
                dailySales: Object.entries(ticketsByDate).map(([date, count]) => ({
                  date,
                  count
                })).sort((a, b) => a.date.localeCompare(b.date))
              };
            } catch (error) {
              if (error.response?.status === 404) {
                console.warn(`Event ${evt.id} not accessible for sales velocity`);
                return null;
              }
              console.error(`Error fetching sales velocity for event ${evt.id}:`, error.message);
              return null;
            }
          })
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            salesVelocity: velocityData.filter(v => v !== null),
            timestamp: new Date().toISOString()
          })
        };

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid action',
            validActions: ['getEvents', 'getEventDetails', 'getSalesVelocity']
          })
        };
    }

  } catch (error) {
    console.error('Ticket Tailor API Error:', error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: error.response?.data?.error || error.message || 'Failed to fetch Ticket Tailor data',
        details: error.response?.data
      })
    };
  }
};
