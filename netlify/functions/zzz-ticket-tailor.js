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
          auth: {
            username: apiKey,
            password: ''
          },
          headers: {
            'Accept': 'application/json'
          },
          params: { 
            status: 'published',
            start: startDate || today.toISOString(),
            limit: 100
          }
        });

        let events = eventsResponse.data.data || [];
        
        console.log(`Fetched ${events.length} events from Ticket Tailor`);
        
        // Fetch ticket data for each event
        const eventsWithTickets = await Promise.all(
          events.map(async (evt) => {
            try {
              const ticketsResponse = await axios.get(
                `${baseUrl}/events/${evt.id}/issued_tickets`,
                {
                  auth: {
                    username: apiKey,
                    password: ''
                  },
                  headers: {
                    'Accept': 'application/json'
                  },
                  params: { limit: 1000 }
                }
              );

              // LOG THE RAW RESPONSE to see what structure we're getting
              console.log(`RAW issued_tickets response for ${evt.id}:`, JSON.stringify(ticketsResponse.data, null, 2));
              
              // Try multiple ways to extract the data
              let tickets = [];
              if (ticketsResponse.data.data && Array.isArray(ticketsResponse.data.data)) {
                tickets = ticketsResponse.data.data;
              } else if (Array.isArray(ticketsResponse.data)) {
                tickets = ticketsResponse.data;
              } else if (ticketsResponse.data.issued_tickets && Array.isArray(ticketsResponse.data.issued_tickets)) {
                tickets = ticketsResponse.data.issued_tickets;
              }
              
              const totalIssued = tickets.length;
              
              console.log(`Event ${evt.name}: ${totalIssued} tickets issued out of ${evt.total_tickets || 0}`);
              
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
              if (error.response?.status === 404) {
                console.warn(`Event ${evt.id} returned 404 when fetching tickets - endpoint may not exist for this event`);
              } else if (error.response?.status === 403) {
                console.warn(`Event ${evt.id} returned 403 - API key may not have permission to access issued_tickets`);
                console.warn(`Check your API key permissions in Ticket Tailor dashboard`);
              } else {
                console.error(`Error fetching tickets for event ${evt.id}:`, error.response?.status, error.message);
              }
              
              // Return event with no ticket data if there's an error
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

        // Return in format frontend expects
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

        try {
          const eventResponse = await axios.get(`${baseUrl}/events/${eventId}`, {
            auth: {
              username: apiKey,
              password: ''
            },
            headers: {
              'Accept': 'application/json'
            }
          });

          const ticketsResponse = await axios.get(
            `${baseUrl}/events/${eventId}/issued_tickets`,
            {
              auth: {
                username: apiKey,
                password: ''
              },
              headers: {
                'Accept': 'application/json'
              },
              params: { limit: 1000 }
            }
          );

          const eventData = eventResponse.data;
          
          // Extract tickets with multiple fallbacks
          let tickets = [];
          if (ticketsResponse.data.data && Array.isArray(ticketsResponse.data.data)) {
            tickets = ticketsResponse.data.data;
          } else if (Array.isArray(ticketsResponse.data)) {
            tickets = ticketsResponse.data;
          }

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
          auth: {
            username: apiKey,
            password: ''
          },
          headers: {
            'Accept': 'application/json'
          },
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
                  auth: {
                    username: apiKey,
                    password: ''
                  },
                  headers: {
                    'Accept': 'application/json'
                  },
                  params: { limit: 1000 }
                }
              );

              // Extract tickets with fallbacks
              let tickets = [];
              if (ticketsResponse.data.data && Array.isArray(ticketsResponse.data.data)) {
                tickets = ticketsResponse.data.data;
              } else if (Array.isArray(ticketsResponse.data)) {
                tickets = ticketsResponse.data;
              }

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
