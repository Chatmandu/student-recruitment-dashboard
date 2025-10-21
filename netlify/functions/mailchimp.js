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

  const apiKey = process.env.MAILCHIMP_API_KEY;
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX || 'us1';
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;

  if (!apiKey || !audienceId) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Mailchimp not configured' })
    };
  }

  const baseUrl = `https://${serverPrefix}.api.mailchimp.com/3.0`;
  const auth = Buffer.from(`anystring:${apiKey}`).toString('base64');

  try {
    const { action, weeks = 12 } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'getLeadStats':
        // Get current audience stats
        const audienceRes = await axios.get(`${baseUrl}/lists/${audienceId}`, {
          headers: { 'Authorization': `Basic ${auth}` }
        });

        // Get growth history for weekly trends
        const growthRes = await axios.get(`${baseUrl}/lists/${audienceId}/growth-history`, {
          headers: { 'Authorization': `Basic ${auth}` },
          params: { count: weeks }
        });

        // Get member count by tag (leads vs applicants)
        const membersRes = await axios.get(`${baseUrl}/lists/${audienceId}/members`, {
          headers: { 'Authorization': `Basic ${auth}` },
          params: { count: 1000, status: 'subscribed' }
        });

        // Count leads vs applicants
        let totalLeads = 0;
        let applicants = 0;
        
        membersRes.data.members.forEach(member => {
          const tags = member.tags.map(t => t.name.toLowerCase());
          if (tags.includes('applicant')) {
            applicants++;
          }
          totalLeads++;
        });

        const leads = totalLeads - applicants;

        // Calculate weekly percentage change
        const growthHistory = growthRes.data.history.reverse();
        const thisWeek = growthHistory[growthHistory.length - 1]?.subscribed || 0;
        const lastWeek = growthHistory[growthHistory.length - 2]?.subscribed || 0;
        const weeklyChange = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek * 100).toFixed(2) : 0;

        // Prepare weekly data for charts
        const weeklyData = growthHistory.map(week => ({
          date: week.month,
          subscribed: week.subscribed,
          unsubscribed: week.unsubscribed,
          net: week.subscribed - week.unsubscribed
        }));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            totalMembers: audienceRes.data.stats.member_count,
            leads,
            applicants,
            conversionRate: totalLeads > 0 ? ((applicants / totalLeads) * 100).toFixed(2) : 0,
            weeklyChange: parseFloat(weeklyChange),
            thisWeekSubscribed: thisWeek,
            lastWeekSubscribed: lastWeek,
            weeklyData,
            lastUpdated: new Date().toISOString()
          })
        };

      case 'getCampaignPerformance':
        // Get recent campaigns
        const campaignsRes = await axios.get(`${baseUrl}/campaigns`, {
          headers: { 'Authorization': `Basic ${auth}` },
          params: {
            count: 10,
            status: 'sent',
            sort_field: 'send_time',
            sort_dir: 'DESC'
          }
        });

        // Get reports for each campaign
        const reportPromises = campaignsRes.data.campaigns.map(campaign =>
          axios.get(`${baseUrl}/reports/${campaign.id}`, {
            headers: { 'Authorization': `Basic ${auth}` }
          }).catch(() => null)
        );

        const reports = await Promise.all(reportPromises);

        const campaignData = reports
          .filter(r => r)
          .map(r => ({
            title: r.data.campaign_title,
            sent: r.data.emails_sent,
            opens: r.data.opens.opens_total,
            clicks: r.data.clicks.clicks_total,
            openRate: (r.data.opens.open_rate * 100).toFixed(2),
            clickRate: (r.data.clicks.click_rate * 100).toFixed(2),
            sendTime: r.data.send_time
          }));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ campaigns: campaignData })
        };

      case 'getLeadSources':
        // Get members with their source tags
        const sourceMembersRes = await axios.get(`${baseUrl}/lists/${audienceId}/members`, {
          headers: { 'Authorization': `Basic ${auth}` },
          params: { count: 1000 }
        });

        const sources = {};
        sourceMembersRes.data.members.forEach(member => {
          member.tags.forEach(tag => {
            const tagName = tag.name;
            if (!tagName.toLowerCase().includes('applicant')) {
              sources[tagName] = (sources[tagName] || 0) + 1;
            }
          });
        });

        const sourceData = Object.entries(sources)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([source, count]) => ({ source, count }));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ sources: sourceData })
        };

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }

  } catch (error) {
    console.error('Mailchimp API Error:', error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: error.response?.data?.detail || error.message || 'Failed to fetch Mailchimp data'
      })
    };
  }
};
