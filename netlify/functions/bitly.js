const https = require('https');

const token = process.env.BITLY_ACCESS_TOKEN;

// Helper function to make authenticated requests to Bitly API
function bitlyFetch(path, params = {}) {
    return new Promise((resolve, reject) => {
        const queryString = Object.keys(params).length > 0 
            ? '?' + Object.entries(params).map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join('&')
            : '';
        
        const options = {
            hostname: 'api-ssl.bitly.com',
            path: `/v4${path}${queryString}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
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
                const groupsResult = await bitlyFetch('/groups');

                if (!groupsResult.ok) {
                    throw new Error('Failed to fetch groups');
                }

                const groupId = groupsResult.data.groups[0].guid;

                // Fetch ALL bitlinks using pagination
                let allLinks = [];
                let searchAfter = null;
                let hasMorePages = true;

                while (hasMorePages) {
                    const params = { size: 100 };
                    if (searchAfter) {
                        params.search_after = searchAfter;
                    }

                    const linksResult = await bitlyFetch(`/groups/${groupId}/bitlinks`, params);

                    if (!linksResult.ok) {
                        throw new Error('Failed to fetch links');
                    }

                    const links = linksResult.data.links || [];
                    allLinks = allLinks.concat(links);

                    // Check if there are more pages
                    if (linksResult.data.pagination?.next && links.length === 100) {
                        searchAfter = linksResult.data.pagination.search_after;
                        hasMorePages = !!searchAfter;
                    } else {
                        hasMorePages = false;
                    }

                    console.log(`Fetched ${links.length} links (total: ${allLinks.length})`);
                }

                // Filter for student-recruitment tagged links
                const recruitmentLinks = allLinks.filter(link =>
                    link.tags?.some(tag => tag.toLowerCase().includes('student') || tag.toLowerCase().includes('recruitment'))
                );

                console.log(`Found ${recruitmentLinks.length} recruitment links`);

                // Get click data for each recruitment link
                const clickPromises = recruitmentLinks.map(link => {
                    const encodedId = encodeURIComponent(link.id);
                    return bitlyFetch(`/bitlinks/${encodedId}/clicks/summary`, {
                        unit: 'day',
                        units: days
                    }).catch(err => {
                        console.error(`Error fetching clicks for ${link.id}:`, err.message);
                        return { ok: false, data: { total_clicks: 0 } };
                    });
                });

                const clicksData = await Promise.all(clickPromises);

                console.log('Fetching referrer data...');
                
                // Get referrer data for each link
                const referrerPromises = recruitmentLinks.map(link => {
                    const encodedId = encodeURIComponent(link.id);
                    return bitlyFetch(`/bitlinks/${encodedId}/referrers`)
                        .then(res => {
                            let metrics = [];
                            if (res.ok) {
                                if (res.data.facet === 'referrers' && Array.isArray(res.data.referrers)) {
                                    metrics = res.data.referrers;
                                } else if (Array.isArray(res.data.metrics)) {
                                    metrics = res.data.metrics;
                                } else if (Array.isArray(res.data)) {
                                    metrics = res.data;
                                }
                                
                                const referrerCount = metrics.length;
                                const totalClicks = metrics.reduce((sum, ref) => sum + (ref.clicks || ref.value || 0), 0);
                                console.log(`Referrers for ${link.id}: ${referrerCount} sources, ${totalClicks} clicks`);
                            }
                            
                            return { data: { metrics: metrics } };
                        }).catch(err => {
                            console.error(`Error fetching referrers for ${link.id}:`, err.message);
                            return { data: { metrics: [] } };
                        });
                });

                const referrersData = await Promise.all(referrerPromises);

                // Get country data for each link
                const countryPromises = recruitmentLinks.map(link => {
                    const encodedId = encodeURIComponent(link.id);
                    return bitlyFetch(`/bitlinks/${encodedId}/countries`, {
                        unit: 'day',
                        units: days
                    }).catch(err => {
                        console.error(`Error fetching countries for ${link.id}:`, err.message);
                        return { data: { metrics: [] } };
                    });
                });

                const countriesData = await Promise.all(countryPromises);

                // Combine all data with properly formatted structure for the modal
                const enrichedLinks = recruitmentLinks.map((link, i) => {
                    const clicks = clicksData[i]?.data?.total_clicks || 0;
                    console.log(`${link.id}: ${clicks} clicks`);
                    
                    // Get referrer data and calculate total clicks from all referrers
                    const rawReferrers = referrersData[i]?.data?.metrics || [];
                    const totalClicksFromReferrers = rawReferrers.reduce((sum, ref) => 
                        sum + (ref.clicks || 0), 0
                    );
                    
                    // Format referrers for modal display (using 'referrer' and 'clicks' keys)
                    const formattedReferrers = rawReferrers.map(ref => ({
                        referrer: ref.value || 'direct',
                        clicks: ref.clicks || 0
                    }));
                    
                    // Format countries for modal display (using 'country' and 'clicks' keys)
                    const rawCountries = countriesData[i]?.data?.metrics || [];
                    const totalCountryClicks = rawCountries.reduce((sum, c) => sum + (c.clicks || 0), 0);
                    const formattedCountries = rawCountries.map(c => ({
                        country: c.value || 'Unknown',
                        clicks: c.clicks || 0,
                        percentage: totalCountryClicks > 0 ? 
                            ((c.clicks / totalCountryClicks) * 100).toFixed(1) : 0
                    }));
                    
                    return {
                        id: link.id,
                        shortUrl: `https://${link.id}`,
                        longUrl: link.long_url,
                        title: link.title || link.long_url,
                        tags: link.tags || [],
                        created: link.created_at,
                        clicks: clicks, // Clicks for selected period
                        totalClicks: totalClicksFromReferrers, // All-time clicks from referrers
                        referrers: formattedReferrers, // Formatted for modal
                        countries: formattedCountries // Formatted for modal
                    };
                });

                // Calculate totals
                const totalClicks = enrichedLinks.reduce((sum, link) => sum + link.clicks, 0);

                console.log(`Total clicks across all links: ${totalClicks}`);

                // Aggregate referrers across all links
                const allReferrers = {};
                enrichedLinks.forEach(link => {
                    link.referrers.forEach(ref => {
                        const referrer = ref.referrer;
                        allReferrers[referrer] = (allReferrers[referrer] || 0) + ref.clicks;
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
                        const countryName = country.country;
                        allCountries[countryName] = (allCountries[countryName] || 0) + country.clicks;
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
                const groupsTrendResult = await bitlyFetch('/groups');

                if (!groupsTrendResult.ok) {
                    throw new Error('Failed to fetch groups');
                }

                const groupIdTrend = groupsTrendResult.data.groups[0].guid;

                // Fetch ALL bitlinks using pagination
                let allLinksTrend = [];
                let searchAfterTrend = null;
                let hasMorePagesTrend = true;

                while (hasMorePagesTrend) {
                    const paramsTrend = { size: 100 };
                    if (searchAfterTrend) {
                        paramsTrend.search_after = searchAfterTrend;
                    }

                    const linksTrendResult = await bitlyFetch(`/groups/${groupIdTrend}/bitlinks`, paramsTrend);

                    if (!linksTrendResult.ok) {
                        throw new Error('Failed to fetch links');
                    }

                    const linksTrend = linksTrendResult.data.links || [];
                    allLinksTrend = allLinksTrend.concat(linksTrend);

                    // Check if there are more pages
                    if (linksTrendResult.data.pagination?.next && linksTrend.length === 100) {
                        searchAfterTrend = linksTrendResult.data.pagination.search_after;
                        hasMorePagesTrend = !!searchAfterTrend;
                    } else {
                        hasMorePagesTrend = false;
                    }
                }

                const recruitmentLinksTrend = allLinksTrend.filter(link =>
                    link.tags?.some(tag => tag.toLowerCase().includes('student') || tag.toLowerCase().includes('recruitment'))
                );

                // Get detailed click data over time for top 5 links
                const topLinks = recruitmentLinksTrend.slice(0, 5);
                const trendPromises = topLinks.map(link => {
                    const encodedId = encodeURIComponent(link.id);
                    return bitlyFetch(`/bitlinks/${encodedId}/clicks`, {
                        unit: 'day',
                        units: days
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
        console.error('Bitly API Error:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Failed to fetch Bitly data'
            })
        };
    }
};
