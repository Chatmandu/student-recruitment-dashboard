const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
const MAILCHIMP_SERVER = process.env.MAILCHIMP_SERVER_PREFIX;
const AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;

const headers = {
    'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
    'Content-Type': 'application/json'
};

exports.handler = async (event) => {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        const { action } = JSON.parse(event.body);

        if (action === 'getLeadStats') {
            return await getLeadStats(corsHeaders);
        } else if (action === 'getCampaigns') {
            return await getCampaigns(corsHeaders);
        } else {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid action' })
            };
        }
    } catch (error) {
        console.error('Error in Mailchimp function:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function mailchimpFetch(url) {
    const https = require('https');
    
    return new Promise((resolve, reject) => {
        const options = {
            headers: headers
        };
        
        https.get(url, options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ ok: res.statusCode === 200, data: parsed, status: res.statusCode });
                } catch (e) {
                    reject(new Error('Failed to parse response'));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function getLeadStats(corsHeaders) {
    try {
        // Get total member count
        const membersUrl = `https://${MAILCHIMP_SERVER}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}`;
        const membersResult = await mailchimpFetch(membersUrl);
        
        if (!membersResult.ok) {
            throw new Error(membersResult.data.detail || 'Failed to fetch members');
        }

        const membersData = membersResult.data;
        const totalLeads = membersData.stats.member_count;

        // Get applicants count (members tagged with 'applicant')
        const applicantsUrl = `https://${MAILCHIMP_SERVER}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/members?count=1000&status=subscribed`;
        const applicantsResult = await mailchimpFetch(applicantsUrl);
        
        if (!applicantsResult.ok) {
            throw new Error(applicantsResult.data.detail || 'Failed to fetch applicants');
        }

        const applicantsData = applicantsResult.data;
        const applicants = applicantsData.members.filter(member => 
            member.tags && member.tags.some(tag => tag.name.toLowerCase() === 'applicant')
        ).length;

        const conversionRate = totalLeads > 0 ? ((applicants / totalLeads) * 100).toFixed(1) : 0;

        // Get weekly activity for the past 12 weeks
        const weeklyData = [];
        const now = new Date();
        
        for (let i = 11; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - (i * 7 + 7));
            const weekEnd = new Date(now);
            weekEnd.setDate(now.getDate() - (i * 7));
            
            const activityUrl = `https://${MAILCHIMP_SERVER}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/growth-history`;
            const activityResult = await mailchimpFetch(activityUrl);
            
            if (activityResult.ok && activityResult.data.history) {
                const weekHistory = activityResult.data.history.find(h => {
                    const historyDate = new Date(h.month);
                    return historyDate >= weekStart && historyDate <= weekEnd;
                });
                
                if (weekHistory) {
                    weeklyData.push({
                        date: weekStart.toISOString(),
                        subscribed: weekHistory.subscribed || 0,
                        unsubscribed: weekHistory.unsubscribed || 0,
                        net: (weekHistory.subscribed || 0) - (weekHistory.unsubscribed || 0)
                    });
                } else {
                    weeklyData.push({
                        date: weekStart.toISOString(),
                        subscribed: 0,
                        unsubscribed: 0,
                        net: 0
                    });
                }
            }
        }

        // Calculate this week's subscriptions
        const thisWeekSubscribed = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1].subscribed : 0;

        // Calculate weekly change percentage
        const lastWeekNet = weeklyData.length >= 2 ? weeklyData[weeklyData.length - 2].net : 0;
        const thisWeekNet = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1].net : 0;
        const weeklyChange = lastWeekNet !== 0 
            ? (((thisWeekNet - lastWeekNet) / Math.abs(lastWeekNet)) * 100).toFixed(1)
            : 0;

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                leads: totalLeads,
                applicants: applicants,
                conversionRate: parseFloat(conversionRate),
                thisWeekSubscribed: thisWeekSubscribed,
                weeklyChange: parseFloat(weeklyChange),
                weeklyData: weeklyData
            })
        };
    } catch (error) {
        console.error('Error fetching lead stats:', error);
        throw error;
    }
}

async function getCampaigns(corsHeaders) {
    try {
        // Get campaigns sent to the student recruitment audience
        // We'll fetch the last 100 sent campaigns and filter to 20
        const campaignsUrl = `https://${MAILCHIMP_SERVER}.api.mailchimp.com/3.0/campaigns?count=100&status=sent&list_id=${AUDIENCE_ID}&sort_field=send_time&sort_dir=DESC`;
        
        const campaignsResult = await mailchimpFetch(campaignsUrl);
        
        if (!campaignsResult.ok) {
            throw new Error(campaignsResult.data.detail || 'Failed to fetch campaigns');
        }

        const campaignsData = campaignsResult.data;

        // Process campaigns to extract key metrics
        const campaigns = campaignsData.campaigns
            .filter(campaign => campaign.status === 'sent' && campaign.send_time)
            .slice(0, 20) // Limit to most recent 20
            .map(campaign => {
                const report = campaign.report_summary || {};
                const emails_sent = report.emails_sent || 0;
                const opens = report.opens || 0;
                const clicks = report.clicks || 0;
                
                return {
                    id: campaign.id,
                    title: campaign.settings?.title || 'Untitled Campaign',
                    subject: campaign.settings?.subject_line || '',
                    send_time: campaign.send_time,
                    emails_sent: emails_sent,
                    opens: opens,
                    open_rate: emails_sent > 0 ? ((opens / emails_sent) * 100).toFixed(1) : '0.0',
                    clicks: clicks,
                    click_rate: emails_sent > 0 ? ((clicks / emails_sent) * 100).toFixed(1) : '0.0',
                    unique_opens: report.unique_opens || 0,
                    unique_clicks: report.subscriber_clicks || 0
                };
            });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                campaigns: campaigns,
                total: campaigns.length
            })
        };
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        throw error;
    }
}
