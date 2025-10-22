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
        
        // Fetch ticket data for each event via ORDERS (not issued_tickets endpoint)
        const eventsWithTickets = await Promise.all(
          events.map(async (evt) => {
            try {
              // Get all orders for this event
              let allOrders = [];
              let hasMore = true;
              let startingAfter = null;
              
              // Paginate through orders
              while (hasMore) {
                const ordersParams = {
                  limit: 100,
                  event_id: evt.id
                };
                
                if (startingAfter) {
                  ordersParams.starting_after = startingAfter;
                }
                
                const ordersResponse = await axios.get(`${baseUrl}/orders`, {
                  auth: {
                    username: apiKey,
                    password: ''
                  },
                  headers: {
                    'Accept': 'application/json'
                  },
                  params: ordersParams
                });
                
                const orders = ordersResponse.data.data || [];
                allOrders = allOrders.concat(orders);
                
                // Check if there are more pages
                if (orders.length < 100) {
                  hasMore = false;
                } else {
                  startingAfter = orders[orders.length - 1].id;
                }
              }
              
              // Count issued tickets from orders
              let totalIssued = 0;
              allOrders.forEach(order => {
                if (order.issued_tickets && Array.isArray(order.issued_tickets)) {
                  totalIssued += order.issued_tickets.length;
                }
              });
              
              console.log(`Event ${evt.name}: ${totalIssued} tickets issued from ${allOrders.length} orders (capacity: ${evt.total_tickets || 0})`);
              
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
              console.error(`Error fetching orders for event ${evt.id}:`, error.response?.status, error.message);
              
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

          // Get orders for this event instead of using issued_tickets endpoint
          const ordersResponse = await axios.get(`${baseUrl}/orders`, {
            auth: {
              username: apiKey,
              password: ''
            },
            headers: {
              'Accept': 'application/json'
            },
            params: {
              event_id: eventId,
              limit: 1000
            }
          });

          const eventData = eventResponse.data;
          const orders = ordersResponse.data.data || [];
          
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
              // Get orders instead of issued_tickets
              const ordersResponse = await axios.get(`${baseUrl}/orders`, {
                auth: {
                  username: apiKey,
                  password: ''
                },
                headers: {
                  'Accept': 'application/json'
                },
                params: {
                  event_id: evt.id,
                  limit: 1000
                }
              });

              const orders = ordersResponse.data.data || [];
              
              // Extract all issued tickets from orders
              let allTickets = [];
              orders.forEach(order => {
                if (order.issued_tickets && Array.isArray(order.issued_tickets)) {
                  allTickets = allTickets.concat(order.issued_tickets);
                }
              });

              const ticketsByDate = allTickets.reduce((acc, ticket) => {
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
