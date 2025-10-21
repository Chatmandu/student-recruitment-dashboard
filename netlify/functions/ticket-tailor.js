const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
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
  const authHeader = `Basic ${Buffer.from(apiKey + ':').toString('base64')}`;

  try {
    const { action, startDate, endDate } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'getEvents':
        // Fetch all current events dynamically
        const eventsResponse = await axios.get(`${baseUrl}/events`, {
          headers: { 'Authorization': authHeader },
          params: { 
            status: 'published', // Only get published events
            start: startDate || new Date().toISOString(), // From today forward by default
            limit: 100 // Adjust as needed
          }
        });

        const events = eventsResponse.data.data || [];

        // Fetch ticket info for each event (with error handling)
        const eventsWithTickets = await Promise.all(
          events.map(async (event) => {
            try {
              const ticketsResponse = await axios.get(
                `${baseUrl}/events/${event.id}/issued_tickets`,
                {
                  headers: { 'Authorization': authHeader },
                  params: { limit: 1000 }
                }
              );

              const tickets = ticketsResponse.data.data || [];
              const totalIssued = tickets.length;
              
              // Group by ticket type
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
              // Handle 404 or other errors gracefully
              if (error.response?.status === 404) {
                console.warn(`Event ${event.id} not found or no longer accessible`);
                return null; // Skip this event
              }
              
              // For other errors, return partial data
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

        // Filter out null values (404 events)
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
        // Get details for a specific event (with 404 handling)
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
            headers: { 'Authorization': authHeader }
          });

          const ticketsResponse = await axios.get(
            `${baseUrl}/events/${eventId}/issued_tickets`,
            {
              headers: { 'Authorization': authHeader },
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
        // Track ticket sales over time for all current events
        const salesEventsResponse = await axios.get(`${baseUrl}/events`, {
          headers: { 'Authorization': authHeader },
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
                  headers: { 'Authorization': authHeader },
                  params: { limit: 1000 }
                }
              );

              const tickets = ticketsResponse.data.data || [];

              // Group tickets by date
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
              // Skip events we can't access
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
# Force rebuild Wed 22 Oct 2025 00:12:53 BST
