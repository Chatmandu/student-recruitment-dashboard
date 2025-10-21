# 🎓 Student Recruitment Dashboard

A real-time analytics dashboard specifically designed for tracking student recruitment activities across Mailchimp, Bitly, and Ticket Tailor.

## 🎯 What It Tracks

### **1. Leads (Mailchimp)**
- Total leads vs applicants
- Weekly percentage increase/decrease
- Lead generation trends over 12 weeks
- Conversion rate (Lead → Applicant)
- Campaign performance
- Lead sources breakdown

### **2. Link Activity (Bitly)**
- Student recruitment tagged links only
- Total clicks per link
- Combined referral activity by platform
- Geographic distribution by location
- Click trends over 30 days
- Device breakdown

### **3. Events (Ticket Tailor)**
- Complete event list with details
- Tickets released vs sold
- Capacity utilization percentages
- Sales velocity tracking
- Attendee vs no-show tracking
- Event performance metrics

## 📊 Dashboard Features

### **Executive KPI Cards**
- **Total Leads** - with weekly % change
- **Applicants** - with conversion rate
- **Link Clicks** - 30-day total
- **Upcoming Events** - count and tickets sold

### **Visual Analytics**
- **Lead Generation Trend** - 12-week line chart
- **Traffic Sources** - Top referrers bar chart
- **Geographic Distribution** - Country breakdown with percentages
- **Event Summary** - Capacity and attendance metrics

### **Detailed Tables**
- **Events Table** - Sortable by date, capacity, sold, percentage
- **Links Table** - All student recruitment links with clicks
- **Real-time Updates** - Auto-refresh every 30 seconds

## 🚀 Quick Start

### **1. Get Your API Keys**

#### Mailchimp
1. Log in to Mailchimp
2. Go to **Account** → **Extras** → **API Keys**
3. Click **Create A Key**
4. Note your **server prefix** (e.g., us1, us2) from the key
5. Get your **Audience ID**: **Audience** → **Settings** → **Audience name and defaults**

#### Bitly
1. Log in to Bitly
2. Go to **Settings** → **Developer Settings** → **API**
3. Click **Generate Token**
4. Copy your access token
5. **Important**: Tag your student recruitment links with "student" or "recruitment"

#### Ticket Tailor
1. Log in to Ticket Tailor
2. Go to **Settings** → **API**
3. Generate an API key
4. Copy the key

### **2. Deploy to Netlify**

#### Option A: Netlify Drop (Fastest)
```bash
# Zip the folder
zip -r student-recruitment-dashboard.zip student-recruitment-dashboard/

# Go to https://app.netlify.com/drop
# Drag and drop the zip file
```

#### Option B: Git + Netlify
```bash
cd student-recruitment-dashboard
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO
git push -u origin main

# Then connect to Netlify:
# https://app.netlify.com → New site from Git
```

#### Option C: Netlify CLI
```bash
npm install -g netlify-cli
cd student-recruitment-dashboard
npm install
netlify login
netlify init
netlify deploy --prod
```

### **3. Configure Environment Variables**

In Netlify Dashboard:
1. Go to **Site settings** → **Environment variables**
2. Add the following:

```
MAILCHIMP_API_KEY=your_key_here
MAILCHIMP_SERVER_PREFIX=us1
MAILCHIMP_AUDIENCE_ID=your_audience_id_here
BITLY_ACCESS_TOKEN=your_token_here
TICKET_TAILOR_API_KEY=your_key_here
```

3. Click **Save**
4. **Trigger a new deployment** for changes to take effect

### **4. Access Your Dashboard**

Visit your Netlify URL (e.g., `your-site.netlify.app`)

## 📋 How It Works

### **Lead Tracking (Mailchimp)**

The dashboard:
- Pulls your total audience member count
- Identifies members tagged as "Applicant"
- Calculates: Total Leads = Total Members - Applicants
- Tracks weekly growth history
- Calculates percentage change week-over-week
- Shows conversion rate (Applicants / Total Leads)

**To track applicants**: Simply add the tag "Applicant" to members in Mailchimp when they apply.

### **Link Tracking (Bitly)**

The dashboard:
- Filters links by tags containing "student" or "recruitment"
- Aggregates clicks across all tagged links
- Breaks down traffic by referrer (Google, Facebook, Direct, etc.)
- Shows geographic distribution
- Displays individual link performance

**To track links**: Tag your Bitly links with "student-recruitment" or similar.

### **Event Tracking (Ticket Tailor)**

The dashboard:
- Lists all published events
- Shows capacity, sold, and available tickets
- Calculates percentage sold for each event
- Tracks checked-in attendees vs no-shows
- Provides overall capacity utilization

**Note**: Attendee tracking happens separately in Ticket Tailor via check-in functionality.

## 🎨 Dashboard Layout

### **Top Section**
- Header with academic year
- Auto-refresh toggle
- Manual refresh button
- Last updated timestamp

### **KPI Cards Row**
Four key metrics with weekly trends

### **Charts Row**
- Lead generation trend (12 weeks)
- Traffic sources breakdown

### **Secondary Metrics**
- Geographic distribution
- Event summary stats

### **Detail Tables**
- Upcoming events (sortable)
- Active recruitment links

## 🔧 Customization

### **Adjust Time Periods**

Edit the API calls in `/public/index.html`:

```javascript
// Change lead tracking period (default: 12 weeks)
callAPI('mailchimp', { action: 'getLeadStats', weeks: 16 })

// Change link tracking period (default: 30 days)
callAPI('bitly', { action: 'getRecruitmentLinks', days: 60 })
```

### **Modify Link Tag Filters**

Edit `/netlify/functions/bitly.js`:

```javascript
// Change the filter criteria
const recruitmentLinks = linksRes.data.links.filter(link => 
  link.tags?.some(tag => 
    tag.toLowerCase().includes('your-custom-tag')
  )
);
```

### **Change Colors**

Edit Tailwind classes in `/public/index.html`:
- `bg-blue-600` → Change blue to other colors
- `text-green-600` → Modify text colors
- `border-red-500` → Adjust borders

## 📊 Understanding Your Data

### **Weekly % Change Calculation**
```
Weekly Change = ((This Week - Last Week) / Last Week) × 100
```

### **Conversion Rate**
```
Conversion Rate = (Applicants / Total Leads) × 100
```

### **Capacity Utilization**
```
Utilization = (Tickets Sold / Total Capacity) × 100
```

### **Attendance Rate**
```
Attendance = (Checked In / Tickets Sold) × 100
```

## 🎯 Best Practices

### **Mailchimp**
- ✅ Tag applicants immediately when they apply
- ✅ Keep one primary audience for recruitment
- ✅ Use segments for different lead types
- ✅ Review automation to avoid contacting applicants

### **Bitly**
- ✅ Tag all recruitment links consistently
- ✅ Use descriptive link names
- ✅ Create unique links for each campaign
- ✅ Review top-performing links weekly

### **Ticket Tailor**
- ✅ Set realistic capacity limits
- ✅ Enable check-in for attendance tracking
- ✅ Monitor sales velocity for popular events
- ✅ Send reminders to reduce no-shows

## 📈 Weekly Report Routine

1. **Monday Morning** - Check weekly % change in leads
2. **Review Top Links** - Identify best-performing campaigns
3. **Event Status** - Check upcoming events at risk of under-booking
4. **Geographic Insights** - Note where engagement is highest
5. **Conversion Tracking** - Monitor Lead → Applicant rate

## 🆘 Troubleshooting

### **No Leads Showing**
- Verify `MAILCHIMP_AUDIENCE_ID` is correct
- Check API key has proper permissions
- Ensure audience has members

### **Links Not Appearing**
- Confirm links are tagged with "student" or "recruitment"
- Verify `BITLY_ACCESS_TOKEN` is valid
- Check if you have any Bitly links at all

### **Events Not Loading**
- Verify `TICKET_TAILOR_API_KEY` is correct
- Ensure you have published events
- Check API key permissions in Ticket Tailor

### **Dashboard Shows Errors**
1. Open browser console (F12)
2. Check for specific error messages
3. Verify all environment variables are set
4. Redeploy after adding variables
5. Check Netlify Functions logs

## 💡 Pro Tips

1. **Use Auto-Refresh** - Enable for live monitoring during campaigns
2. **Sort Events** - Click column headers in events table to sort
3. **Track Trends** - Look for patterns in weekly data
4. **Geographic Focus** - Use location data to target campaigns
5. **Monitor Capacity** - Get alerts when events hit 80% sold

## 🔒 Security

- ✅ API keys stored as environment variables
- ✅ Never exposed in frontend code
- ✅ Serverless functions handle all API calls
- ✅ HTTPS enforced automatically
- ✅ No data stored on servers

## 📱 Mobile Access

The dashboard is fully responsive and works on:
- Desktop computers
- Tablets
- Smartphones

## 🎓 Academic Year Tracking

The dashboard automatically displays the current academic year:
- **October-July**: Shows current year / next year
- **August-September**: Shows previous year / current year

## 📞 Support

### Common Questions

**Q: How often does data update?**
A: Real-time when you refresh, or every 30 seconds with auto-refresh enabled.

**Q: Can I export the data?**
A: Currently manual export. Future versions will include PDF/Excel export.

**Q: Can I track multiple audiences?**
A: Currently one audience. Contact us for multi-audience tracking.

**Q: What's the API rate limit?**
A: Mailchimp: 10 requests/second. Bitly: 100 requests/minute. Ticket Tailor: 100 requests/minute.

### Getting Help

1. Check this README
2. Review browser console for errors
3. Check Netlify Functions logs
4. Verify API credentials

## 🚀 Future Enhancements

Planned features:
- [ ] Weekly email reports
- [ ] PDF export functionality
- [ ] Year-over-year comparisons
- [ ] Campaign ROI tracking
- [ ] Custom alert thresholds
- [ ] Multiple audience support

## 📝 Version History

**v1.0** (Current)
- Initial release
- Lead tracking with weekly % change
- Bitly link analytics by tag
- Ticket Tailor event management
- Real-time dashboard
- Auto-refresh capability

---

## 🎉 You're All Set!

Your student recruitment dashboard is ready to help you track and improve your recruitment efforts throughout the October-August recruitment cycle.

**Quick Links:**
- [Netlify Dashboard](https://app.netlify.com)
- [Mailchimp](https://mailchimp.com)
- [Bitly](https://bitly.com)
- [Ticket Tailor](https://www.tickettailor.com)

Built specifically for UK higher education student recruitment teams.
