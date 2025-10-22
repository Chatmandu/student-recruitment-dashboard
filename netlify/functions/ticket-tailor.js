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
        
        // Map events to match frontend expectations
        const mappedEvents = events.map(evt => {
          return {
            id: evt.id,
            name: evt.name,
            start: evt.start?.date || evt.start,
            venue: evt.venue?.name || 'TBA',
            capacity: evt.total_tickets || 0,
            sold: 0, // Can't access with current permissions
            available: evt.total_tickets || 0,
            url: evt.url,
            status: evt.status
          };
        });

        const totalSold = mappedEvents.reduce((sum, evt) => sum + evt.sold, 0);

        // Return in format frontend expects
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            upcomingEvents: mappedEvents,
            summary: {
              totalSold: totalSold,
              totalEvents: mappedEvents.length
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

          const eventData = eventResponse.data;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              event: {
                ...eventData,
                ticketsIssued: 0,
                tickets: [],
                note: 'Ticket details not available with current API permissions'
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
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            salesVelocity: [],
            timestamp: new Date().toISOString(),
            note: 'Sales velocity not available without ticket access permissions'
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
