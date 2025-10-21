# 🚀 Quick Start Guide - Student Recruitment Dashboard

Get your dashboard live in 10 minutes!

## Step 1: Gather Your API Keys (5 minutes)

### Mailchimp
1. Login → **Account** → **Extras** → **API Keys** → **Create A Key**
2. Copy: API Key + Server Prefix (e.g., "us1")
3. Get Audience ID: **Audience** → **Settings** → Copy ID

### Bitly  
1. Login → **Settings** → **Developer Settings** → **API** → **Generate Token**
2. Copy token
3. **Tag your recruitment links** with "student-recruitment"

### Ticket Tailor
1. Login → **Settings** → **API** → Generate key
2. Copy key

## Step 2: Deploy to Netlify (2 minutes)

### Easiest Method: Drag & Drop

1. **Zip the folder:**
   ```bash
   zip -r student-recruitment-dashboard.zip student-recruitment-dashboard/
   ```

2. **Go to:** https://app.netlify.com/drop

3. **Drag and drop** your zip file

4. **Wait 30 seconds** - You'll get a URL like `random-name.netlify.app`

### Alternative: Netlify CLI

```bash
npm install -g netlify-cli
cd student-recruitment-dashboard
netlify login
netlify init
netlify deploy --prod
```

## Step 3: Add Your API Keys (3 minutes)

1. **In Netlify Dashboard**, click on your new site

2. **Go to:** Site settings → Environment variables → Add a variable

3. **Add these five variables:**

```
MAILCHIMP_API_KEY          = your_mailchimp_key
MAILCHIMP_SERVER_PREFIX    = us1 (or your prefix)
MAILCHIMP_AUDIENCE_ID      = your_audience_id
BITLY_ACCESS_TOKEN         = your_bitly_token
TICKET_TAILOR_API_KEY      = your_ticket_tailor_key
```

4. **Click Save**

5. **Trigger a new deployment:**
   - Deploys tab → Trigger deploy → Deploy site

## Step 4: Open Your Dashboard! 🎉

Visit your Netlify URL - Your dashboard is live!

## ✅ Success Checklist

Your dashboard is working if you see:
- ✅ Total Leads number (from Mailchimp)
- ✅ Recruitment links (from Bitly)
- ✅ Upcoming events (from Ticket Tailor)
- ✅ No errors in top-right

## 🔧 Quick Fixes

### "Mailchimp not configured"
- Double-check your API key is correct
- Verify server prefix (us1, us2, etc.)
- Confirm audience ID is accurate

### "No links showing"
- Tag your Bitly links with "student-recruitment"
- Wait 30 seconds and refresh
- Check you have created some Bitly links

### "Events not loading"
- Verify Ticket Tailor API key
- Ensure you have published events
- Check API permissions in Ticket Tailor

## 💡 Pro Tips

1. **Enable Auto-Refresh** - Toggle it on for live monitoring
2. **Tag Your Links** - Use "student-recruitment" in Bitly
3. **Tag Applicants** - Add "Applicant" tag in Mailchimp
4. **Bookmark Your URL** - Easy daily access

## 📊 What You'll See

### Top Row
- Total Leads (with weekly % change)
- Applicants (with conversion rate)
- Link Clicks
- Upcoming Events

### Charts
- Lead generation trend (12 weeks)
- Traffic sources breakdown
- Geographic distribution
- Event summary

### Tables
- All upcoming events (sortable)
- Student recruitment links with clicks

## 🎓 Setting Up Your Tags

### In Mailchimp:
When someone applies → Add tag "Applicant" to stop automation

### In Bitly:
When creating a link → Add tag "student-recruitment"

## 📱 Access Anywhere

The dashboard works on:
- Desktop
- Tablet
- Phone

Just visit your Netlify URL from any device!

## ⏱️ Timeline

- **Step 1** (API Keys): 5 minutes
- **Step 2** (Deploy): 2 minutes  
- **Step 3** (Configure): 3 minutes
- **Total**: 10 minutes

## 🆘 Need Help?

1. Open browser console (F12) for errors
2. Check Netlify Functions logs
3. Verify all 5 environment variables are set
4. Make sure you redeployed after adding variables

## 📖 Next Steps

- Read the full [README.md](README.md) for detailed features
- Review [API_GUIDE.md](API_GUIDE.md) for API details
- Check out customization options in README

---

**You're done!** 🎉 Your recruitment dashboard is now tracking leads, links, and events in real-time.

**Your Dashboard URL:** `your-site-name.netlify.app`

**Recruitment Period:** October - August

**Happy recruiting!** 🎓
