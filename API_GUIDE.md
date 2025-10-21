# 🔑 API Configuration Guide

Detailed instructions for obtaining and configuring each API key.

## 📧 Mailchimp Setup

### Getting Your API Key

1. **Log in to Mailchimp**: https://mailchimp.com

2. **Navigate to Account Settings**:
   - Click your profile icon (top-right)
   - Select "Account & billing"

3. **Go to API Keys**:
   - Click "Extras" in the sidebar
   - Select "API keys"

4. **Create a New Key**:
   - Click "Create A Key"
   - Give it a name: "Student Recruitment Dashboard"
   - Click "Generate Key"
   - **Copy the key immediately** (you can't see it again)

5. **Note Your Server Prefix**:
   - Look at your API key
   - It will look like: `abc123...xyz-us1`
   - The part after the dash (`us1`, `us2`, etc.) is your server prefix

### Getting Your Audience ID

1. **Go to Audience**:
   - Click "Audience" in main navigation
   - Select "All contacts"

2. **Open Settings**:
   - Click "Settings" dropdown
   - Select "Audience name and defaults"

3. **Copy Audience ID**:
   - Look for "Audience ID"
   - It's an alphanumeric code like: `abc123def4`
   - Copy this code

### Setting Up Applicant Tracking

**Important**: The dashboard identifies applicants by the "Applicant" tag in Mailchimp.

1. **When someone applies**, add a tag:
   - Go to the contact
   - Click "Add tags"
   - Type "Applicant"
   - Save

2. **Automate it** (optional):
   - Create an automation that adds the "Applicant" tag
   - Trigger: When form submitted / specific action taken
   - Action: Add tag "Applicant"

3. **Bulk tagging**:
   - Select multiple contacts
   - Click "Add tags"
   - Add "Applicant" tag
   - Apply to all selected

### What the Dashboard Tracks

- **Total Members** in your audience
- **Leads** = Total members WITHOUT "Applicant" tag
- **Applicants** = Members WITH "Applicant" tag
- **Weekly Growth** (new subscriptions)
- **Conversion Rate** = Applicants / Total Members

---

## 🔗 Bitly Setup

### Getting Your Access Token

1. **Log in to Bitly**: https://bitly.com

2. **Go to Settings**:
   - Click your profile icon (top-right)
   - Select "Settings"

3. **Navigate to Developer Settings**:
   - In the sidebar, find "Developer settings"
   - Click "API"

4. **Generate Token**:
   - Click "Generate Token"
   - Enter your password to confirm
   - **Copy the token** (you can't see it again)

### Tagging Your Links for Tracking

**Critical**: The dashboard only tracks links tagged with "student" or "recruitment".

#### When Creating a New Link:

1. **Create your short link** as normal

2. **Add tags**:
   - Look for "Tags" field
   - Add: `student-recruitment`
   - Or: `student` or `recruitment` (any tag containing these words)

3. **Save the link**

#### Tagging Existing Links:

1. **Go to Links** in Bitly dashboard

2. **Click on a link** to edit it

3. **Add tags**:
   - Find "Tags" section
   - Add: `student-recruitment`

4. **Save changes**

#### Best Practices for Tags:

```
✅ Good tags:
- student-recruitment
- student-open-day
- recruitment-campaign
- undergraduate-recruitment

❌ Won't be tracked:
- marketing
- general
- website
```

### What the Dashboard Tracks

From **tagged links only**:
- Total clicks across all recruitment links
- Individual link performance
- Top referrers (where clicks come from)
- Geographic distribution
- Click trends over time

---

## 🎫 Ticket Tailor Setup

### Getting Your API Key

1. **Log in to Ticket Tailor**: https://www.tickettailor.com

2. **Go to Settings**:
   - Click "Settings" in the sidebar

3. **Navigate to API Settings**:
   - Look for "API" or "Integrations"
   - Click "API"

4. **Generate an API Key**:
   - Click "Generate new API key"
   - Give it a name: "Student Recruitment Dashboard"
   - **Copy the key**

5. **Set Permissions** (if asked):
   - Read access to: Events, Issued Tickets
   - This is typically the default

### Event Setup for Tracking

The dashboard automatically pulls:
- All published events
- Ticket types and quantities
- Issued tickets
- Check-in status

#### To Get Full Data:

1. **Publish Your Events**:
   - Unpublished events won't show
   - Dashboard filters for status: "published"

2. **Set Ticket Quantities**:
   - Define how many tickets available
   - This determines capacity

3. **Enable Check-in** (for attendance tracking):
   - In event settings
   - Enable "Check-in" feature
   - Use Ticket Tailor app to check people in at event

### What the Dashboard Tracks

For each event:
- Event name, date, venue
- Total capacity (sum of all ticket types)
- Tickets sold
- Tickets available
- Percentage sold
- Checked-in attendees
- No-shows (sold but not checked in)

Overall metrics:
- Total events
- Upcoming vs past events
- Overall capacity utilization
- Total attendance rate

### Tracking No-Shows

**Important**: No-show tracking requires using Ticket Tailor's check-in feature.

1. **At the event**:
   - Use Ticket Tailor mobile app
   - Scan tickets or manually check in attendees

2. **Dashboard calculates**:
   - No-Shows = Tickets Sold - Checked In
   - Attendance Rate = Checked In / Tickets Sold

3. **If you don't use check-in**:
   - Dashboard will show 0% attendance
   - This is expected - just ignore that metric

---

## 🔐 Security Best Practices

### Storing API Keys

**Never**:
- ❌ Share API keys publicly
- ❌ Commit them to GitHub
- ❌ Email them in plain text
- ❌ Store in frontend code

**Always**:
- ✅ Store as Netlify environment variables
- ✅ Keep a secure backup (password manager)
- ✅ Regenerate if compromised
- ✅ Use unique keys per application

### Key Rotation

**Recommended schedule**:
- Review keys every 6 months
- Regenerate annually
- Immediately if compromised

**To rotate a key**:
1. Generate new key in the service
2. Update Netlify environment variable
3. Redeploy
4. Delete old key from service

---

## 📋 Configuration Checklist

Use this checklist when setting up:

### Mailchimp
- [ ] API key copied
- [ ] Server prefix noted (us1, us2, etc.)
- [ ] Audience ID copied
- [ ] "Applicant" tag created
- [ ] Test: Tagged one member as "Applicant"

### Bitly
- [ ] Access token copied
- [ ] Created at least one test link
- [ ] Tagged test link with "student-recruitment"
- [ ] Verified tag appears in Bitly

### Ticket Tailor
- [ ] API key copied
- [ ] At least one event published
- [ ] Ticket quantities set
- [ ] Check-in enabled (optional)

### Netlify
- [ ] All 5 environment variables added
- [ ] Spelling verified (copy from .env.example)
- [ ] Site redeployed after adding variables
- [ ] Dashboard loads without errors

---

## 🧪 Testing Your Setup

### Test Mailchimp:

1. Open dashboard
2. Check "Total Leads" shows a number
3. Tag someone as "Applicant" in Mailchimp
4. Refresh dashboard
5. "Applicants" number should increase

### Test Bitly:

1. Create a test link in Bitly
2. Tag it with "student-recruitment"
3. Click the link a few times
4. Refresh dashboard
5. Link should appear in "Student Recruitment Links" table

### Test Ticket Tailor:

1. Create a test event in Ticket Tailor
2. Publish it
3. Set a ticket quantity
4. Refresh dashboard
5. Event should appear in "Upcoming Events"

---

## 🆘 Troubleshooting

### "Mailchimp not configured"

**Check**:
1. API key is correct (no spaces)
2. Server prefix matches your account
3. Audience ID is correct
4. Key has necessary permissions

**Fix**:
- Regenerate API key in Mailchimp
- Copy carefully (no extra spaces)
- Update Netlify variable
- Redeploy

### "Bitly not configured"

**Check**:
1. Access token is correct
2. Token hasn't expired
3. At least one link is tagged
4. Tags include "student" or "recruitment"

**Fix**:
- Generate new token in Bitly
- Update Netlify variable
- Add tags to your links
- Wait 30 seconds and refresh

### "Ticket Tailor not configured"

**Check**:
1. API key is correct
2. You have published events
3. Key has read permissions

**Fix**:
- Regenerate API key
- Update Netlify variable
- Publish at least one test event
- Redeploy site

---

## 💡 Pro Tips

1. **Use descriptive names** when creating API keys (helps track them)
2. **Keep a backup** of all keys in a password manager
3. **Test each service individually** before combining
4. **Check Netlify Functions logs** for specific error messages
5. **Redeploy always** after changing environment variables

---

## 📞 Support Resources

- **Mailchimp API Docs**: https://mailchimp.com/developer/
- **Bitly API Docs**: https://dev.bitly.com/
- **Ticket Tailor API Docs**: https://www.tickettailor.com/developers/
- **Netlify Docs**: https://docs.netlify.com/

---

**Next Steps**: Once all APIs are configured, read [QUICK_START.md](QUICK_START.md) for deployment instructions.
