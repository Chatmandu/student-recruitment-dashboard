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

  const token = process.env.BITLY_ACCESS_TOKEN;

  if (!token) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Bitly not configured' })
    };
  }

  try {
    const { action, days = 30 } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'getRecruitmentLinks':
        // Get all groups
        const groupsRes = await axios.get('https://api-ssl.bitly.com/v4/groups', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const groupId = groupsRes.data.groups[0].guid;

        // Get all bitlinks
        const linksRes = await axios.get(`https://api-ssl.bitly.com/v4/groups/${groupId}/bitlinks`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { size: 100 }
        });

        // Filter for student-recruitment tagged links
        const recruitmentLinks = linksRes.data.links.filter(link => 
          link.tags?.some(tag => tag.toLowerCase().includes('student') || tag.toLowerCase().includes('recruitment'))
        );

        console.log(`Found ${recruitmentLinks.length} recruitment links`);

        // Get click data for each recruitment link (URL encode the ID)
        const clickPromises = recruitmentLinks.map(link => {
          const encodedId = encodeURIComponent(link.id);
          return axios.get(`https://api-ssl.bitly.com/v4/bitlinks/${encodedId}/clicks/summary`, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { unit: 'day', units: days }
          }).catch(err => {
            console.error(`Error fetching clicks for ${link.id}:`, err.response?.data || err.message);
            return { data: { total_clicks: 0 } };
          });
        });

        const clicksData = await Promise.all(clickPromises);

        // Get referrer data for each link
        const referrerPromises = recruitmentLinks.map(link => {
          const encodedId = encodeURIComponent(link.id);
          return axios.get(`https://api-ssl.bitly.com/v4/bitlinks/${encodedId}/referrers`, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { unit: 'day', units: days }
          }).catch(err => {
            console.error(`Error fetching referrers for ${link.id}:`, err.response?.data || err.message);
            return { data: { referrers: [] } };
          });
        });

        const referrersData = await Promise.all(referrerPromises);

        // Get country data for each link
        const countryPromises = recruitmentLinks.map(link => {
          const encodedId = encodeURIComponent(link.id);
          return axios.get(`https://api-ssl.bitly.com/v4/bitlinks/${encodedId}/countries`, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { unit: 'day', units: days }
          }).catch(err => {
            console.error(`Error fetching countries for ${link.id}:`, err.response?.data || err.message);
            return { data: { metrics: [] } };
          });
        });

        const countriesData = await Promise.all(countryPromises);

        // Combine all data
        const enrichedLinks = recruitmentLinks.map((link, i) => {
          const clicks = clicksData[i]?.data?.total_clicks || 0;
          console.log(`${link.id}: ${clicks} clicks`);
          
          return {
            id: link.id,
            shortUrl: `https://${link.id}`,
            longUrl: link.long_url,
            title: link.title || link.long_url,
            tags: link.tags || [],
            created: link.created_at,
            clicks: clicks,
            referrers: referrersData[i]?.data?.referrers || [],
            countries: countriesData[i]?.data?.metrics || []
          };
        });

        // Calculate totals
        const totalClicks = enrichedLinks.reduce((sum, link) => sum + link.clicks, 0);

        console.log(`Total clicks across all links: ${totalClicks}`);

        // Aggregate referrers across all links
        const allReferrers = {};
        enrichedLinks.forEach(link => {
          link.referrers.forEach(ref => {
            const referrer = ref.referrer || 'direct';
            allReferrers[referrer] = (allReferrers[referrer] || 0) + (ref.clicks || 0);
          });
        });

        const topReferrers = Object.entries(allReferrers)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([referrer, clicks]) => ({ referrer, clicks }));

        // Aggregate countries across all links
        const allCountries = {};
        enrichedLinks.forEach(link => {
          link.countries.forEach(country => {
            const countryName = country.value || 'Unknown';
            allCountries[countryName] = (allCountries[countryName] || 0) + (country.clicks || 0);
          });
        });

        const topCountries = Object.entries(allCountries)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([country, clicks]) => ({ 
            country, 
            clicks,
            percentage: totalClicks > 0 ? ((clicks / totalClicks) * 100).toFixed(2) : 0
          }));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            links: enrichedLinks.sort((a, b) => b.clicks - a.clicks),
            totalClicks,
            totalLinks: enrichedLinks.length,
            topReferrers,
            topCountries,
            lastUpdated: new Date().toISOString()
          })
        };

      case 'getLinkTrends':
        // Get groups
        const groupsTrendRes = await axios.get('https://api-ssl.bitly.com/v4/groups', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const groupIdTrend = groupsTrendRes.data.groups[0].guid;

        // Get bitlinks
        const linksTrendRes = await axios.get(`https://api-ssl.bitly.com/v4/groups/${groupIdTrend}/bitlinks`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { size: 100 }
        });

        const recruitmentLinksTrend = linksTrendRes.data.links.filter(link => 
          link.tags?.some(tag => tag.toLowerCase().includes('student') || tag.toLowerCase().includes('recruitment'))
        );

        // Get detailed click data over time for top 5 links
        const topLinks = recruitmentLinksTrend.slice(0, 5);
        const trendPromises = topLinks.map(link => {
          const encodedId = encodeURIComponent(link.id);
          return axios.get(`https://api-ssl.bitly.com/v4/bitlinks/${encodedId}/clicks`, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { unit: 'day', units: days }
          }).catch(() => ({ data: { link_clicks: [] } }));
        });

        const trendsData = await Promise.all(trendPromises);

        const linkTrends = topLinks.map((link, i) => ({
          id: link.id,
          title: link.title || link.id,
          data: trendsData[i]?.data?.link_clicks || []
        }));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ linkTrends })
        };

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }

  } catch (error) {
    console.error('Bitly API Error:', error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: error.response?.data?.message || error.message || 'Failed to fetch Bitly data'
      })
    };
  }
};
