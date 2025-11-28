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

        // Get member activity for proper weekly tracking
        // Note: Mailchimp growth-history is MONTHLY, so we'll fetch member activity instead
        const activityUrl = `https://${MAILCHIMP_SERVER}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/growth-history`;
        const activityResult = await mailchimpFetch(activityUrl);
        
        const weeklyData = [];
        const now = new Date();
        
        if (activityResult.ok && activityResult.data.history) {
            // Mailchimp returns monthly data, so we'll aggregate by weeks
            // Get last 12 weeks of data by processing monthly history
            const history = activityResult.data.history;
            
            for (let i = 11; i >= 0; i--) {
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - (i * 7 + 7));
                weekStart.setHours(0, 0, 0, 0);
                
                const weekEnd = new Date(now);
                weekEnd.setDate(now.getDate() - (i * 7));
                weekEnd.setHours(23, 59, 59, 999);
                
                // Find the monthly record that contains this week
                const monthRecord = history.find(h => {
                    const recordDate = new Date(h.month);
                    const recordMonth = recordDate.getMonth();
                    const recordYear = recordDate.getFullYear();
                    const weekMonth = weekStart.getMonth();
                    const weekYear = weekStart.getFullYear();
                    
                    return recordMonth === weekMonth && recordYear === weekYear;
                });
                
                if (monthRecord) {
                    // Approximate weekly values from monthly totals (divide by ~4)
                    const weeklySubscribed = Math.round((monthRecord.subscribed || 0) / 4);
                    const weeklyUnsubscribed = Math.round((monthRecord.unsubscribed || 0) / 4);
                    
                    weeklyData.push({
                        date: weekStart.toISOString(),
                        subscribed: weeklySubscribed,
                        unsubscribed: weeklyUnsubscribed,
                        net: weeklySubscribed - weeklyUnsubscribed
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
        } else {
            // Fallback: create empty weekly data
            for (let i = 11; i >= 0; i--) {
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - (i * 7 + 7));
                
                weeklyData.push({
                    date: weekStart.toISOString(),
                    subscribed: 0,
                    unsubscribed: 0,
                    net: 0
                });
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
        const campaignsUrl = `https://${MAILCHIMP_SERVER}.api.mailchimp.com/3.0/campaigns?count=50&status=sent&list_id=${AUDIENCE_ID}&sort_field=send_time&sort_dir=DESC`;
        
        const campaignsResult = await mailchimpFetch(campaignsUrl);
        
        if (!campaignsResult.ok) {
            throw new Error(campaignsResult.data.detail || 'Failed to fetch campaigns');
        }

        const campaignsData = campaignsResult.data;
        
        // Get the most recent 20 campaigns
        const recentCampaigns = campaignsData.campaigns
            .filter(campaign => campaign.status === 'sent' && campaign.send_time)
            .slice(0, 20);

        // Fetch full report data for each campaign (this has the actual metrics)
        const reportPromises = recentCampaigns.map(campaign => {
            const reportUrl = `https://${MAILCHIMP_SERVER}.api.mailchimp.com/3.0/reports/${campaign.id}`;
            return mailchimpFetch(reportUrl)
                .then(res => {
                    if (res.ok) {
                        return { campaign, report: res.data };
                    }
                    console.error(`Failed to fetch report for campaign ${campaign.id}`);
                    return { campaign, report: null };
                })
                .catch(err => {
                    console.error(`Error fetching report for campaign ${campaign.id}:`, err.message);
                    return { campaign, report: null };
                });
        });

        const campaignsWithReports = await Promise.all(reportPromises);

        // Process campaigns with full report data
        const campaigns = campaignsWithReports.map(({ campaign, report }) => {
            if (report) {
                // Use the full report data which has accurate metrics
                const emails_sent = report.emails_sent || 0;
                const opens = report.opens?.unique_opens || 0;
                const clicks = report.clicks?.unique_clicks || 0;
                
                // Debug logging to see what's in the clicks object
                if (campaign.id) {
                    console.log(`Campaign ${campaign.settings?.title}: clicks object =`, JSON.stringify(report.clicks));
                }
                
                return {
                    id: campaign.id,
                    title: campaign.settings?.title || 'Untitled Campaign',
                    subject: campaign.settings?.subject_line || '',
                    send_time: campaign.send_time,
                    emails_sent: emails_sent,
                    opens: opens,
                    open_rate: emails_sent > 0 ? parseFloat(((opens / emails_sent) * 100).toFixed(1)) : 0,
                    clicks: clicks,
                    click_rate: emails_sent > 0 ? parseFloat(((clicks / emails_sent) * 100).toFixed(1)) : 0
                };
            } else {
                // Fallback to summary data if report fetch failed
                const summary = campaign.report_summary || {};
                const emails_sent = summary.emails_sent || 0;
                const opens = summary.unique_opens || 0;
                const clicks = summary.subscriber_clicks || 0;
                
                return {
                    id: campaign.id,
                    title: campaign.settings?.title || 'Untitled Campaign',
                    subject: campaign.settings?.subject_line || '',
                    send_time: campaign.send_time,
                    emails_sent: emails_sent,
                    opens: opens,
                    open_rate: emails_sent > 0 ? parseFloat(((opens / emails_sent) * 100).toFixed(1)) : 0,
                    clicks: clicks,
                    click_rate: emails_sent > 0 ? parseFloat(((clicks / emails_sent) * 100).toFixed(1)) : 0
                };
            }
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
